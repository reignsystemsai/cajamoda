import fs from 'node:fs';

const must=(value,message)=>{if(!value)throw new Error(message)};
const replaceOnce=(text,from,to,label)=>{const i=text.indexOf(from);must(i>=0,`missing ${label}`);must(text.indexOf(from,i+from.length)<0,`duplicate ${label}`);return text.slice(0,i)+to+text.slice(i+from.length)};
const functionSlice=(text,name)=>{const start=text.indexOf(`async function ${name}(`);must(start>=0,`missing ${name}`);const end=text.indexOf('\nasync function ',start+1);must(end>start,`could not bound ${name}`);return{start,end,body:text.slice(start,end)}};

let server=fs.readFileSync('server.js','utf8');
server=replaceOnce(server,'const CREATOR_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;','const CREATOR_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;','session ttl');

const helpers=String.raw`
const CREATOR_PASSWORD_MIN_LENGTH = 8;

function creatorPasswordHash(password) {
  const value = String(password || "");
  if (value.length < CREATOR_PASSWORD_MIN_LENGTH) throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, 64).toString("hex");
  return "scrypt$" + salt + "$" + hash;
}

function creatorPasswordFromBody(body = {}) {
  const password = String(body.password || "");
  const confirmation = String(body.passwordConfirmation || "");
  if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");
  return creatorPasswordHash(password);
}

function verifyCreatorPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const expected = Buffer.from(parts[2], "hex");
    const actual = crypto.scryptSync(String(password || ""), parts[1], expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}

async function revokeCreatorSessions(creatorId) {
  if (!creatorId) return;
  await fetch(SUPABASE_URL + "/rest/v1/creator_sessions?creator_id=eq." + encodeURIComponent(creatorId) + "&revoked_at=is.null", {
    method: "PATCH",
    headers: livePresenceHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
}

function maskCreatorEmail(email) {
  const parts = String(email || "").split("@");
  const name = parts[0];
  const domain = parts[1];
  return name && domain ? name.slice(0, 1) + "***@" + domain : "";
}

async function completeCreatorPasswordSetup(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return sendError(response, 503, "El acceso de creadoras no está disponible.");
  const body = await readBody(request);
  const profile = await creatorProfileForAccessToken(safeText(body?.token, 200));
  if (!profile || profile.status !== "active") return sendError(response, 401, "El enlace venció o ya fue utilizado.");
  let passwordHash;
  try { passwordHash = creatorPasswordFromBody(body); }
  catch (error) { return sendError(response, 400, error.message); }
  const nowIso = new Date().toISOString();
  const saved = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?id=eq." + encodeURIComponent(profile.id), {
    method: "PATCH",
    headers: livePresenceHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ password_hash: passwordHash, password_set_at: nowIso, access_token_hash: null, access_token_expires_at: null, updated_at: nowIso })
  });
  if (!saved.ok) return sendError(response, 503, "No pudimos guardar tu contraseña.");
  await revokeCreatorSessions(profile.id);
  const sessionToken = await createCreatorSession(profile.id);
  return sendJson(response, 200, { ok: true, sessionToken });
}

async function changeCreatorPassword(request, response) {
  const profile = await creatorProfileForSession(request);
  if (!profile) return sendError(response, 401, "Inicia sesión en tu cuenta de creadora.");
  const body = await readBody(request);
  if (!profile.password_hash || !verifyCreatorPassword(body?.currentPassword, profile.password_hash)) return sendError(response, 401, "La contraseña actual no es correcta.");
  let passwordHash;
  try { passwordHash = creatorPasswordFromBody(body); }
  catch (error) { return sendError(response, 400, error.message); }
  const nowIso = new Date().toISOString();
  const saved = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?id=eq." + encodeURIComponent(profile.id), {
    method: "PATCH",
    headers: livePresenceHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ password_hash: passwordHash, password_set_at: nowIso, updated_at: nowIso })
  });
  if (!saved.ok) return sendError(response, 503, "No pudimos cambiar tu contraseña.");
  await revokeCreatorSessions(profile.id);
  const sessionToken = await createCreatorSession(profile.id);
  return sendJson(response, 200, { ok: true, sessionToken });
}

async function recoverCreatorEmail(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return sendError(response, 503, "El acceso de creadoras no está disponible.");
  const body = await readBody(request);
  const phone = safeText(body?.phone, 40).replace(/\D/g, "");
  if (phone.length < 7) return sendError(response, 400, "Ingresa el número de teléfono asociado a tu cuenta.");
  const lookup = await fetch(SUPABASE_URL + "/rest/v1/creator_applications?select=email,phone,status&status=eq.approved&limit=500", { headers: livePresenceHeaders() });
  const rows = lookup.ok ? await lookup.json().catch(() => []) : [];
  const application = Array.isArray(rows) ? rows.find(row => String(row.phone || "").replace(/\D/g, "") === phone) : null;
  if (!application?.email) return sendError(response, 404, "No encontramos una cuenta activa con ese número.");
  return sendJson(response, 200, { ok: true, maskedEmail: maskCreatorEmail(application.email) });
}
`;

server=server.replace('async function completeCreatorOnboarding(request, response) {',helpers+'\nasync function completeCreatorOnboarding(request, response) {');
let section=functionSlice(server,'completeCreatorOnboarding');
let body=section.body;
body=replaceOnce(body,'  const body = await readBody(request);','  const body = await readBody(request);\n  let onboardingPasswordHash;\n  try { onboardingPasswordHash = creatorPasswordFromBody(body); }\n  catch (error) { return sendError(response, 400, error.message); }','onboarding body');
const sessionMatch=body.match(/const sessionToken = await createCreatorSession\(([^)]+)\);/);
must(sessionMatch,'missing onboarding session creation');
const creatorIdExpression=sessionMatch[1];
const passwordSave='const passwordSaved = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?id=eq." + encodeURIComponent('+creatorIdExpression+'), { method: "PATCH", headers: livePresenceHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ password_hash: onboardingPasswordHash, password_set_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });\n  if (!passwordSaved.ok) return sendError(response, 503, "No pudimos guardar tu contraseña.");\n  ';
body=body.replace(sessionMatch[0],passwordSave+sessionMatch[0]);
server=server.slice(0,section.start)+body+server.slice(section.end);

section=functionSlice(server,'requestCreatorLogin');
let linkFunction=section.body.replace('async function requestCreatorLogin(','async function requestCreatorPasswordLink(').replaceAll('enlace de acceso','enlace para configurar o restablecer tu contraseña').replaceAll('ENLACE DE ACCESO','CONFIGURAR CONTRASEÑA').replaceAll('Entrar a mi cuenta','Configurar contraseña');
const loginFunction=String.raw`async function requestCreatorLogin(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return sendError(response, 503, "El acceso de creadoras no está disponible.");
  const body = await readBody(request);
  const email = safeText(body?.email, 254).toLowerCase();
  const password = String(body?.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(response, 401, "Correo o contraseña incorrectos.");
  const query = new URLSearchParams({ select: "*", email: "eq." + email, status: "eq.active", limit: "1" });
  const lookup = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?" + query, { headers: livePresenceHeaders() });
  const rows = lookup.ok ? await lookup.json().catch(() => []) : [];
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile) return sendError(response, 401, "Correo o contraseña incorrectos.");
  if (!profile.password_hash) return sendJson(response, 409, { ok: false, code: "PASSWORD_SETUP_REQUIRED", error: "Necesitas crear tu contraseña para continuar." });
  if (!verifyCreatorPassword(password, profile.password_hash)) return sendError(response, 401, "Correo o contraseña incorrectos.");
  const sessionToken = await createCreatorSession(profile.id);
  return sendJson(response, 200, { ok: true, sessionToken });
}`;
server=server.slice(0,section.start)+linkFunction+'\n\n'+loginFunction+server.slice(section.end);

const loginRoute='        if(request.method === "POST" && url.pathname === "/api/creators/login"){\n          await requestCreatorLogin(request,response);\n          return;\n        }';
const extraRoutes='\n\n        if(request.method === "POST" && url.pathname === "/api/creators/password-link"){\n          await requestCreatorPasswordLink(request,response);\n          return;\n        }\n\n        if(request.method === "POST" && url.pathname === "/api/creators/password/setup"){\n          await completeCreatorPasswordSetup(request,response);\n          return;\n        }\n\n        if(request.method === "POST" && url.pathname === "/api/creators/password/change"){\n          await changeCreatorPassword(request,response);\n          return;\n        }\n\n        if(request.method === "POST" && url.pathname === "/api/creators/email-recovery"){\n          await recoverCreatorEmail(request,response);\n          return;\n        }';
server=replaceOnce(server,loginRoute,loginRoute+extraRoutes,'creator auth routes');

const deactivateError='if (!profileUpdate.ok) return sendError(response, 503, "No pudimos desactivar el enlace de la creadora.");';
const deactivateErrorIndex=server.indexOf(deactivateError);
must(deactivateErrorIndex>=0,'missing deactivation block');
server=server.slice(0,deactivateErrorIndex+deactivateError.length)+'\n    const profileRows = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?select=id&application_id=eq." + encodeURIComponent(applicationId) + "&limit=1", { headers });\n    const profileList = profileRows.ok ? await profileRows.json().catch(() => []) : [];\n    if (profileList[0]?.id) await revokeCreatorSessions(profileList[0].id);'+server.slice(deactivateErrorIndex+deactivateError.length);
const savedAfterDeactivate=server.indexOf('  const saved = await fetch(',deactivateErrorIndex);
must(savedAfterDeactivate>deactivateErrorIndex,'missing save after deactivation');
const reactivate='  if (status === "approved" && application.status === "declined") {\n    const profileUpdate = await fetch(SUPABASE_URL + "/rest/v1/creator_profiles?application_id=eq." + encodeURIComponent(applicationId), { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "active", deactivated_at: null, updated_at: now }) });\n    if (!profileUpdate.ok) return sendError(response, 503, "No pudimos reactivar la cuenta de la creadora.");\n  }\n';
server=server.slice(0,savedAfterDeactivate)+reactivate+server.slice(savedAfterDeactivate);
fs.writeFileSync('server.js',server);

let accept=fs.readFileSync('creators/accept/index.html','utf8');
accept=replaceOnce(accept,'Revisa el acuerdo, registra tu método de pago y firma electrónicamente para activar tu cuenta de creadora.','Revisa el acuerdo, registra tu método de pago, crea tu contraseña y firma electrónicamente para activar tu cuenta de creadora.','accept copy');
accept=replaceOnce(accept,'<div class="field"><label id="destinationLabel">Número de Nequi</label><input id="destination" inputmode="numeric" placeholder="300 000 0000"></div><button class="button" id="activate" disabled>ACEPTAR Y CONTINUAR</button>','<div class="field"><label id="destinationLabel">Número de Nequi</label><input id="destination" inputmode="numeric" placeholder="300 000 0000"></div><div class="field"><label>Crea tu contraseña</label><input id="password" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres"></div><div class="field"><label>Confirma tu contraseña</label><input id="passwordConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="Repite tu contraseña"></div><button class="button" id="activate" disabled>ACEPTAR Y CONTINUAR</button>','accept password fields');
accept=replaceOnce(accept,'agreement=document.querySelector("#agreement"),message=document.querySelector("#message"),button=document.querySelector("#activate");','agreement=document.querySelector("#agreement"),password=document.querySelector("#password"),passwordConfirm=document.querySelector("#passwordConfirm"),message=document.querySelector("#message"),button=document.querySelector("#activate");','accept password refs');
accept=replaceOnce(accept,'body:JSON.stringify({token,agreementAccepted:agreement.checked,payoutMethod:method.value,payoutDestination:destination.value})','body:JSON.stringify({token,agreementAccepted:agreement.checked,payoutMethod:method.value,payoutDestination:destination.value,password:password.value,passwordConfirmation:passwordConfirm.value})','accept request');
fs.writeFileSync('creators/accept/index.html',accept);

let portal=fs.readFileSync('creators/index.html','utf8');
const oldLoginMarkup='<section class="glass login" id="login"><div class="eyebrow">RED DE CREADORAS</div><h1>Acceso para creadoras</h1><p class="muted">Ingresa tu correo aprobado y te enviaremos un enlace seguro para entrar a tu ecosistema CajaModa.</p><div class="field"><label>Correo electrónico</label><input id="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div><button class="button" id="sendLogin">ENVIAR ENLACE SEGURO</button><p class="message" id="loginMessage"></p></section>';
const newLoginMarkup='<section class="glass login" id="login"><div class="eyebrow">RED DE CREADORAS</div><h1>Acceso para creadoras</h1><p class="muted">Ingresa con tu correo y contraseña.</p><div class="field"><label>Correo electrónico</label><input id="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div><div class="field"><label>Contraseña</label><input id="password" type="password" autocomplete="current-password" placeholder="Tu contraseña"></div><button class="button" id="sendLogin">ENTRAR</button><div class="photoControls" style="margin-top:12px;flex-wrap:wrap"><button class="button secondary" id="forgotPassword" type="button">OLVIDÉ MI CONTRASEÑA</button><button class="button secondary" id="forgotEmail" type="button">OLVIDÉ MI CORREO</button></div><div class="hidden" id="legacySetup"><p class="muted">Necesitas crear tu contraseña para continuar.</p><button class="button secondary" id="sendSetupLink" type="button">ENVIAR ENLACE DE CONFIGURACIÓN</button></div><div class="hidden" id="emailRecovery"><div class="field"><label>Teléfono de tu cuenta</label><input id="recoveryPhone" type="tel" autocomplete="tel"></div><button class="button secondary" id="recoverEmail" type="button">RECUPERAR CORREO</button><p class="muted" id="recoveryMessage"></p></div><p class="message" id="loginMessage"></p></section><section class="glass login hidden" id="passwordSetup"><div class="eyebrow">SEGURIDAD DE TU CUENTA</div><h1>Crea tu contraseña</h1><p class="muted">Este enlace se usa una sola vez para crear o restablecer tu contraseña.</p><div class="field"><label>Nueva contraseña</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8"></div><div class="field"><label>Confirmar contraseña</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="8"></div><button class="button" id="completePasswordSetup">GUARDAR CONTRASEÑA</button><p class="message" id="setupMessage"></p></section>';
portal=replaceOnce(portal,oldLoginMarkup,newLoginMarkup,'portal login markup');
const oldAccount='<section class="glass section"><h2>Cuenta y acuerdo</h2><p>Tu enlace: <strong id="profileLink"></strong></p><p>Estado del acuerdo: <strong id="agreementStatus">Vigente</strong></p><a href="/creators/terms/" target="_blank">Ver Acuerdo del Programa de Creadoras</a></section>';
const newAccount='<section class="glass section"><h2>Cuenta y acuerdo</h2><p>Tu enlace: <strong id="profileLink"></strong></p><p>Estado del acuerdo: <strong id="agreementStatus">Vigente</strong></p><a href="/creators/terms/" target="_blank">Ver Acuerdo del Programa de Creadoras</a><h3>Cambiar contraseña</h3><div class="field"><label>Contraseña actual</label><input id="currentPassword" type="password" autocomplete="current-password"></div><div class="field"><label>Nueva contraseña</label><input id="changedPassword" type="password" autocomplete="new-password" minlength="8"></div><div class="field"><label>Confirmar nueva contraseña</label><input id="changedPasswordConfirm" type="password" autocomplete="new-password" minlength="8"></div><button class="button secondary" id="changePassword" type="button">CAMBIAR CONTRASEÑA</button><p class="message" id="changePasswordMessage"></p></section>';
portal=replaceOnce(portal,oldAccount,newAccount,'profile password controls');
const oldConsume='async function consume(){const token=new URLSearchParams(location.search).get("token");if(!token)return;try{const r=await fetch(`${API}/api/creators/session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}),d=await r.json();if(d.sessionToken)localStorage.setItem(KEY,d.sessionToken)}finally{history.replaceState({},"",location.pathname)}}';
portal=replaceOnce(portal,oldConsume,'function showPasswordSetupFromToken(){const token=new URLSearchParams(location.search).get("token");if(!token)return;$("#login").classList.add("hidden");$("#passwordSetup").classList.remove("hidden")}', 'legacy token handler');
const oldLoginHandler='$("#sendLogin").onclick=async()=>{const d=await fetch(`${API}/api/creators/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#email").value})}).then(r=>r.json());$("#loginMessage").textContent=d.message||d.error};';
const newLoginHandler='$("#sendLogin").onclick=async()=>{const r=await fetch(`${API}/api/creators/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#email").value,password:$("#password").value})}),d=await r.json().catch(()=>({}));if(d.sessionToken){localStorage.setItem(KEY,d.sessionToken);await load();return}$("#loginMessage").textContent=d.error||"No pudimos iniciar sesión.";$("#legacySetup").classList.toggle("hidden",d.code!=="PASSWORD_SETUP_REQUIRED")};$("#forgotPassword").onclick=async()=>{const email=$("#email").value.trim();if(!email){$("#loginMessage").textContent="Ingresa tu correo primero.";return}const d=await fetch(`${API}/api/creators/password-link`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})}).then(r=>r.json());$("#loginMessage").textContent=d.message||d.error||"Revisa tu correo."};$("#sendSetupLink").onclick=$("#forgotPassword").onclick;$("#forgotEmail").onclick=()=>$("#emailRecovery").classList.toggle("hidden");$("#recoverEmail").onclick=async()=>{const r=await fetch(`${API}/api/creators/email-recovery`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:$("#recoveryPhone").value})}),d=await r.json().catch(()=>({}));$("#recoveryMessage").textContent=d.maskedEmail?`Tu correo es ${d.maskedEmail}`:(d.error||"No encontramos tu cuenta.")};$("#completePasswordSetup").onclick=async()=>{const token=new URLSearchParams(location.search).get("token")||"",r=await fetch(`${API}/api/creators/password/setup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password:$("#newPassword").value,passwordConfirmation:$("#confirmPassword").value})}),d=await r.json().catch(()=>({}));if(!r.ok){$("#setupMessage").textContent=d.error||"No pudimos guardar tu contraseña.";return}localStorage.setItem(KEY,d.sessionToken);history.replaceState({},"",location.pathname);$("#passwordSetup").classList.add("hidden");await load()};';
portal=replaceOnce(portal,oldLoginHandler,newLoginHandler,'portal login handler');
const logoutHandler='$("#logout").onclick=()=>{localStorage.removeItem(KEY);location.reload()};';
const changePasswordHandler='$("#changePassword").onclick=async()=>{try{const d=await api("/api/creators/password/change",{method:"POST",body:JSON.stringify({currentPassword:$("#currentPassword").value,password:$("#changedPassword").value,passwordConfirmation:$("#changedPasswordConfirm").value})});localStorage.setItem(KEY,d.sessionToken);$("#currentPassword").value=$("#changedPassword").value=$("#changedPasswordConfirm").value="";$("#changePasswordMessage").textContent="Contraseña actualizada."}catch(e){$("#changePasswordMessage").textContent=e.message}};';
portal=replaceOnce(portal,logoutHandler,changePasswordHandler+logoutHandler,'change password handler');
portal=replaceOnce(portal,'consume().then(load);','showPasswordSetupFromToken();load();','portal startup');
fs.writeFileSync('creators/index.html',portal);

fs.writeFileSync('supabase/migrations/202609160001_creator_password_auth.sql','alter table public.creator_profiles\n  add column if not exists password_hash text,\n  add column if not exists password_set_at timestamptz;\n');
