(function () {
  "use strict";

  const API_BASE = "https://cajamoda-storeload-api.onrender.com";
  const TOKEN_KEY = "cajamoda-store-loader-token";
  const colors = {
    views: "#7f8dff",
    checkouts: "#55f5b4",
    purchases: "#ffbf69"
  };
  let currentData = null;
  let days = 30;
  let sortKey = "overall";
  let sortDirection = "desc";
  let productPageSize = 10;
  let productPage = 1;
  let pollTimer = null;
  let loading = false;
  let drawToken = 0;
  let chatTimer = null;
  let chatOpen = false;
  let lastPeerMessageId = "";

  const $ = id => document.getElementById(id);
  const qsa = selector => [...document.querySelectorAll(selector)];

  function token() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function number(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function percent(value) {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1
    }).format(Number(value || 0));
  }

  function duration(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    if (value < 60) return Math.round(value) + "s";
    return Math.floor(value / 60) + "m " + Math.round(value % 60) + "s";
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  async function request(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token()
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Analytics could not be loaded.");
    return data;
  }

  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width: rect.width, height: rect.height };
  }

  function drawTrend(series) {
    const canvas = $("analyticsTrendCanvas");
    if (!canvas) return;
    const tokenValue = ++drawToken;
    const values = Array.isArray(series) ? series : [];
    const start = performance.now();
    const durationMs = 650;

    function frame(timestamp) {
      if (tokenValue !== drawToken) return;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const { context, width, height } = sizeCanvas(canvas);
      context.clearRect(0, 0, width, height);
      const padding = { top: 18, right: 15, bottom: 28, left: 38 };
      const chartWidth = Math.max(1, width - padding.left - padding.right);
      const chartHeight = Math.max(1, height - padding.top - padding.bottom);
      const maximum = Math.max(
        1,
        ...values.flatMap(point => [point.views, point.checkouts, point.purchases].map(Number))
      );

      context.strokeStyle = "rgba(255,255,255,.07)";
      context.lineWidth = 1;
      context.font = "10px Inter, Arial";
      context.fillStyle = "#626772";
      context.textAlign = "right";
      for (let line = 0; line <= 4; line += 1) {
        const y = padding.top + chartHeight * line / 4;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillText(number(maximum * (1 - line / 4)), padding.left - 8, y + 3);
      }

      const plotted = Math.max(1, Math.ceil(values.length * eased));
      [
        ["views", colors.views],
        ["checkouts", colors.checkouts],
        ["purchases", colors.purchases]
      ].forEach(([key, color]) => {
        context.beginPath();
        values.slice(0, plotted).forEach((point, index) => {
          const x = padding.left + chartWidth * (values.length <= 1 ? 0 : index / (values.length - 1));
          const y = padding.top + chartHeight * (1 - Number(point[key] || 0) / maximum);
          if (index === 0) context.moveTo(x, y);
          else {
            const previous = values[index - 1];
            const previousX = padding.left + chartWidth * (index - 1) / Math.max(1, values.length - 1);
            const previousY = padding.top + chartHeight * (1 - Number(previous[key] || 0) / maximum);
            const midpoint = (previousX + x) / 2;
            context.bezierCurveTo(midpoint, previousY, midpoint, y, x, y);
          }
        });
        context.strokeStyle = color;
        context.lineWidth = key === "views" ? 2.4 : 1.8;
        context.shadowColor = color;
        context.shadowBlur = 12;
        context.stroke();
        context.shadowBlur = 0;
      });

      if (values.length) {
        context.textAlign = "left";
        context.fillStyle = "#626772";
        context.fillText(values[0].date.slice(5), padding.left, height - 7);
        context.textAlign = "right";
        context.fillText(values[values.length - 1].date.slice(5), width - padding.right, height - 7);
      }
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function drawDonut(channels) {
    const canvas = $("analyticsDonutCanvas");
    if (!canvas) return;
    const { context, width, height } = sizeCanvas(canvas);
    context.clearRect(0, 0, width, height);
    const rows = (Array.isArray(channels) ? channels : []).filter(row => Number(row.sessions || 0) > 0);
    const total = rows.reduce((sum, row) => sum + Number(row.sessions || 0), 0);
    const palette = {
      whatsapp: "#55f5b4",
      instagram: "#ca77ff",
      tiktok: "#5de2ff",
      meta: "#7f8dff",
      direct: "#ffbf69",
      other: "#777c87"
    };
    const radius = Math.max(35, Math.min(width, height) * .31);
    const lineWidth = Math.max(18, radius * .24);
    const centerX = width / 2;
    const centerY = height / 2;
    let angle = -Math.PI / 2;
    if (!total) {
      context.strokeStyle = "rgba(255,255,255,.07)";
      context.lineWidth = lineWidth;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();
      return;
    }
    rows.forEach(row => {
      const span = Math.PI * 2 * Number(row.sessions || 0) / total;
      context.beginPath();
      context.strokeStyle = palette[row.channel] || palette.other;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.arc(centerX, centerY, radius, angle + .025, angle + span - .025);
      context.stroke();
      angle += span;
    });
  }

  function renderProducts() {
    const body = $("analyticsProductRows");
    if (!body || !currentData) return;
    qsa("[data-product-sort]").forEach(header => {
      header.classList.toggle("sorted", header.dataset.productSort === sortKey && header.dataset.sortDirection === sortDirection);
    });
    const allProducts = [...(currentData.topProducts || [])]
      .sort((left, right) => {
        const score = product =>
          Number(product.views || 0) +
          Number(product.favorites || 0) * 4 +
          Number(product.shares || 0) * 5 +
          Number(product.addToCart || 0) * 8 +
          Number(product.checkouts || 0) * 15 +
          Number(product.purchases || 0) * 100;
        if (sortKey === "overall") {
          const purchaseResult = sortDirection === "asc"
            ? Number(left.purchases || 0) - Number(right.purchases || 0)
            : Number(right.purchases || 0) - Number(left.purchases || 0);
          if (purchaseResult) return purchaseResult;
        }
        const leftValue = sortKey === "overall" ? score(left) : Number(left[sortKey] || 0);
        const rightValue = sortKey === "overall" ? score(right) : Number(right[sortKey] || 0);
        const result = sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
        return result || Number(right.views || 0) - Number(left.views || 0) || String(left.name).localeCompare(String(right.name));
      });
    const totalPages = Math.max(1,Math.ceil(allProducts.length / productPageSize));
    productPage = Math.min(productPage,totalPages);
    const start = (productPage - 1) * productPageSize;
    const products = allProducts.slice(start,start + productPageSize);
    setText("analyticsProductCount",`${allProducts.length} products loaded · ${productPageSize} slots shown`);
    qsa("[data-page-size]").forEach(button => button.classList.toggle("active",Number(button.dataset.pageSize) === productPageSize));
    if ($("analyticsPreviousPage")) $("analyticsPreviousPage").disabled = productPage <= 1;
    if ($("analyticsNextPage")) $("analyticsNextPage").disabled = productPage >= totalPages;
    const productRows = products.map(product => {
      const image = product.image
        ? '<img src="' + escapeHtml(product.image) + '" alt="" loading="lazy">'
        : '<span class="analyticsProductFallback">CM</span>';
      return '<tr>' +
        '<td><div class="analyticsProduct">' + image + '<div><strong>' + escapeHtml(product.name || "Product") + '</strong><span>' + escapeHtml(product.productId) + '</span></div></div></td>' +
        '<td>' + number(product.views) + '</td>' +
        '<td>' + number(product.favorites) + '</td>' +
        '<td>' + number(product.shares) + '</td>' +
        '<td>' + number(product.addToCart) + '</td>' +
        '<td>' + number(product.checkouts) + '</td>' +
        '<td>' + number(product.purchases) + '</td>' +
      '</tr>';
    });
    const emptySlotCount = Math.max(0,productPageSize - productRows.length);
    const emptyRows = Array.from({length:emptySlotCount},(_,index) => '<tr class="analyticsEmptyProductSlot"><td><div class="analyticsProduct"><span class="analyticsProductFallback">' + (start + products.length + index + 1) + '</span><div><strong>Available product slot</strong><span>No product loaded</span></div></div></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>');
    body.innerHTML = [...productRows,...emptyRows].join("");
    body.querySelectorAll("img").forEach(image => {
      image.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.className = "analyticsProductFallback";
        fallback.textContent = "CM";
        image.replaceWith(fallback);
      }, { once: true });
    });
  }

  function renderHotProducts(products = []) {
    const root = $("analyticsHotList");
    if (!root) return;
    root.innerHTML = products.length ? products.map((product,index) => '<article class="analyticsHotItem">' +
      (product.image ? '<img class="analyticsHotThumb" src="' + escapeHtml(product.image) + '" alt="" loading="lazy">' : '<span class="analyticsHotThumb analyticsHotThumbFallback">CM</span>') +
      '<div><strong>' + escapeHtml(product.name || "Product") + '</strong><small>SKU ' + escapeHtml(product.sku || product.productId || "—") + '</small><span>' + escapeHtml(product.status || "Watch") + ' · ' + escapeHtml(product.reason || "New activity detected.") + '</span></div>' +
      '<b class="analyticsHotScore">' + number(product.signalScore) + ' pts</b>' +
      '<span class="analyticsHotRank" aria-label="Rank ' + (index + 1) + '">' + (index + 1) + '</span>' +
    '</article>').join("") : '<div class="analyticsHotEmpty">No new-product momentum alerts yet. Alerts appear as real activity arrives.</div>';
    root.querySelectorAll("img").forEach(image => image.addEventListener("error",() => { const fallback = document.createElement("span"); fallback.className = "analyticsHotThumb analyticsHotThumbFallback"; fallback.textContent = "CM"; image.replaceWith(fallback); },{once:true}));
  }

  function renderFunnel(rows) {
    const root = $("analyticsFunnel");
    if (!root) return;
    const values = Array.isArray(rows) ? rows : [];
    const maximum = Math.max(1, ...values.map(item => Number(item.value || 0)));
    root.innerHTML = values.map(item =>
      '<div class="analyticsFunnelRow">' +
        '<div class="analyticsFunnelLabel">' + escapeHtml(item.label) + '</div>' +
        '<div class="analyticsFunnelTrack"><div class="analyticsFunnelFill" style="width:' + Math.max(1, Number(item.value || 0) / maximum * 100) + '%"></div></div>' +
        '<div class="analyticsFunnelValue">' + number(item.value) + '</div>' +
      '</div>'
    ).join("");
  }

  function renderChannels(rows) {
    const root = $("analyticsChannels");
    if (!root) return;
    const values = Array.isArray(rows) ? rows : [];
    const maximum = Math.max(1, ...values.map(item => Number(item.sessions || 0)));
    root.innerHTML = values.map(item => {
      const roas = item.roas === null ? "—" : Number(item.roas).toFixed(2) + "×";
      return '<div class="analyticsChannelRow">' +
        '<div class="analyticsChannelName">' + escapeHtml(item.channel) + '</div>' +
        '<div class="analyticsChannelTrack"><div class="analyticsChannelFill" style="width:' + Math.max(1, Number(item.sessions || 0) / maximum * 100) + '%"></div></div>' +
        '<div class="analyticsChannelValue">' + number(item.sessions) + ' sessions · ' + number(item.purchases) + ' sales<br>' + money(item.revenue) + ' · ROAS ' + roas + '</div>' +
      '</div>';
    }).join("");
  }

  function creatorPerson(a){const f=String(a?.first_name||""),l=String(a?.last_name||""),instagram=String(a?.instagram_username||"").replace(/^@/,""),tiktok=String(a?.tiktok_username||"").replace(/^@/,""),phoneDigits=String(a?.phone||"").replace(/\D/g,""),submittedDate=a?.created_at?new Date(a.created_at):null,validSubmitted=submittedDate&&!Number.isNaN(submittedDate.getTime()),agreementDate=a?.agreement_accepted_at?new Date(a.agreement_accepted_at):null,validAgreement=agreementDate&&!Number.isNaN(agreementDate.getTime());return{id:String(a?.id||""),name:(f+" "+l).trim()||"CajaModa Creator",email:String(a?.email||""),location:[a?.city,a?.department].filter(Boolean).join(", ")||"—",instagram,tiktok,phoneDigits,initials:(f.slice(0,1)+l.slice(0,1)).toUpperCase()||"CM",submittedDate:validSubmitted?new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeZone:"America/Bogota"}).format(submittedDate):"—",submittedTime:validSubmitted?new Intl.DateTimeFormat("en-US",{timeStyle:"short",timeZone:"America/Bogota"}).format(submittedDate)+" COT":"—",status:String(a?.status||"new"),onboardingStatus:String(a?.onboarding_status||""),slug:String(a?.creator_slug||""),tier:Number(a?.tier||0),commissionRate:Number(a?.commission_rate||0),agreementVersion:String(a?.agreement_version||""),agreementAccepted:validAgreement?new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Bogota"}).format(agreementDate)+" COT":"Not signed",payoutMethod:String(a?.payout_account?.method||""),payoutDestination:String(a?.payout_account?.destination||a?.payout_account?.destination_masked||"Not provided"),visits:Number(a?.visits||a?.analytics?.visits||0),orders:Number(a?.paid_orders||a?.analytics?.paid_orders||0),sales:Number(a?.sales_total||a?.analytics?.sales_total||0),conversion:Number(a?.conversion_rate||a?.analytics?.conversion_rate||0)}}
  function creatorProfileLinks(p){return[p.instagram?'<a class="creatorLink" href="https://www.instagram.com/'+encodeURIComponent(p.instagram)+'" target="_blank" rel="noopener">Instagram</a>':"",p.tiktok?'<a class="creatorLink" href="https://www.tiktok.com/@'+encodeURIComponent(p.tiktok)+'" target="_blank" rel="noopener">TikTok</a>':""].filter(Boolean).join("")}
  function creatorIdentity(p){return'<div class="creatorApplicant"><span class="creatorApplicantAvatar">'+escapeHtml(p.initials)+'</span><div><strong>'+escapeHtml(p.name)+'</strong><span>'+escapeHtml(p.email)+'</span></div></div>'}
  function creatorReferralUrl(slug){return "https://www.cajamoda.com/"+encodeURIComponent(slug)}
  function creatorAction(id,status,label,className=""){return'<button class="creatorAction '+className+'" type="button" data-creator-id="'+escapeHtml(id)+'" data-creator-status="'+escapeHtml(status)+'">'+escapeHtml(label)+'</button>'}
  function creatorTierActions(p){return'<div class="creatorActions">'+[1,2,3].map(tier=>'<button class="creatorAction '+(p.tier===tier?'primary':'')+'" type="button" data-creator-id="'+escapeHtml(p.id)+'" data-creator-status="approved" data-creator-tier="'+tier+'">Tier '+tier+'</button>').join("")+'</div>'}
  function creatorProductsSold(products){const rows=Array.isArray(products)?products:[];return rows.length?rows.map(item=>{const name=item?.productName||item?.name||"Product";const quantity=Math.max(1,Number(item?.quantity||1));const size=item?.size||item?.selectedSize||"";return escapeHtml(name)+" × "+number(quantity)+(size?" · "+escapeHtml(size):"")}).join("<br>"):"—"}
  let activeCreatorSales=null;
  const selectedCreatorApplicationIds=new Set();
  function updateCreatorDeleteControls(){const boxes=qsa("[data-creator-select]");const selected=boxes.filter(box=>box.checked);const selectAll=$("creatorSelectAll"),button=$("creatorDeleteSelected");if(selectAll){selectAll.checked=boxes.length>0&&selected.length===boxes.length;selectAll.indeterminate=selected.length>0&&selected.length<boxes.length}if(button){button.disabled=selected.length===0;button.textContent=selected.length?"Delete selected ("+selected.length+")":"Delete selected"}}
  function creatorSalesDate(value){if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?"—":new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeZone:"America/Bogota"}).format(date)}
  function creatorSalesStatusLabel(value){const status=String(value||"earned").toLowerCase();if(status==="authorized")return"Authorized";if(status==="paid")return"Paid";if(status==="reversed")return"Reversed";return"Commission earned"}
  function renderCreatorSalesChart(series){
    const chart=$("creatorSalesChart");if(!chart)return;
    const values=(Array.isArray(series)?series:[]).map(point=>({date:String(point?.date||""),value:Math.max(0,Number(point?.value||0))})).filter(point=>point.date);
    const width=760,height=220,left=52,right=18,top=16,bottom=34,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maximum=Math.max(1,...values.map(point=>point.value));
    const grid=Array.from({length:5},(_,index)=>{const y=top+(plotHeight/4)*index;const value=maximum-(maximum/4)*index;return'<line class="creatorSalesChartGrid" x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'"></line><text class="creatorSalesChartLabel" x="'+(left-8)+'" y="'+(y+3)+'" text-anchor="end">'+escapeHtml(number(value))+'</text>'}).join("");
    if(!values.length){chart.innerHTML='<defs><linearGradient id="creatorSalesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d58aa5" stop-opacity=".28"/><stop offset="1" stop-color="#d58aa5" stop-opacity="0"/></linearGradient></defs>'+grid+'<text class="creatorSalesChartLabel" x="380" y="112" text-anchor="middle">No paid sales in this period</text>';return}
    const points=values.map((point,index)=>{const x=values.length===1?left+plotWidth/2:left+(plotWidth*index)/(values.length-1);const y=top+plotHeight-(point.value/maximum)*plotHeight;return{x,y,...point}});
    const path=points.map((point,index)=>(index?"L":"M")+point.x.toFixed(1)+" "+point.y.toFixed(1)).join(" ");
    const area=path+" L "+points.at(-1).x.toFixed(1)+" "+(top+plotHeight)+" L "+points[0].x.toFixed(1)+" "+(top+plotHeight)+" Z";
    const labels=points.map((point,index)=>index===0||index===points.length-1||index===Math.floor(points.length/2)?'<text class="creatorSalesChartLabel" x="'+point.x+'" y="'+(height-10)+'" text-anchor="middle">'+escapeHtml(creatorSalesDate(point.date))+'</text>':"").join("");
    const dots=points.map(point=>'<circle class="creatorSalesChartDot" cx="'+point.x+'" cy="'+point.y+'" r="4"></circle>').join("");
    chart.innerHTML='<defs><linearGradient id="creatorSalesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d58aa5" stop-opacity=".28"/><stop offset="1" stop-color="#d58aa5" stop-opacity="0"/></linearGradient></defs>'+grid+'<path class="creatorSalesChartArea" d="'+area+'"></path><path class="creatorSalesChartLine" d="'+path+'"></path>'+dots+labels;
  }
  function renderCreatorSales(data){
    const creator=data?.creator||{},totals=data?.totals||{},activity=data?.activity||{},ledger=Array.isArray(data?.ledger)?data.ledger:[];
    const fullName=[creator.firstName,creator.lastName].filter(Boolean).join(" ")||activeCreatorSales?.name||"Creator";
    const initials=[creator.firstName,creator.lastName].filter(Boolean).map(value=>String(value).slice(0,1)).join("").toUpperCase()||"CM";
    setText("creatorSalesTitle",fullName);setText("creatorSalesAvatar",initials);setText("creatorSalesLink","cajamoda.com/"+(creator.slug||""));setText("creatorSalesTier","Tier "+number(creator.tier)+" · "+number(creator.commissionRate)+"% commission");
    const status=$("creatorSalesAccountStatus");if(status){status.textContent=String(creator.status||"inactive").toLowerCase()==="active"?"Active":"Deactivated";status.classList.toggle("inactive",String(creator.status||"").toLowerCase()!=="active")}
    setText("creatorSalesRevenue",money(totals.grossSales??totals.productSales));setText("creatorSalesOrders",number(totals.orders));setText("creatorSalesAuthorized",number(totals.authorizedOrders));setText("creatorSalesCommission",money(totals.commission));setText("creatorSalesDueFirst",money(totals.dueOnFirst));setText("creatorSalesDueFifteenth",money(totals.dueOnFifteenth));
    setText("creatorActivityVisits",number(activity.visits));setText("creatorActivityViews",number(activity.productViews));setText("creatorActivityLikes",number(activity.likes));setText("creatorActivityShares",number(activity.shares));setText("creatorActivityFavorites",number(activity.favorites));setText("creatorActivityCarts",number(activity.carts));setText("creatorActivityCheckouts",number(activity.checkouts));setText("creatorActivityConversion",percent(activity.conversion));
    renderCreatorSalesChart(data?.series);
    const body=$("creatorSalesRows");if(!body)return;
    body.innerHTML=ledger.length?ledger.map(sale=>{const state=String(sale.status||"earned").toLowerCase();const amountDue=state==="authorized"?"Pending capture":money(sale.amountDue);const payout=creatorSalesDate(sale.payoutDate);return'<tr><td>'+escapeHtml(creatorSalesDate(sale.orderDate))+'</td><td class="creatorSalesProducts">'+creatorProductsSold(sale.products)+'</td><td>'+money(sale.orderTotal)+'</td><td>'+number(sale.commissionRate)+'% · '+money(sale.commissionAmount)+'</td><td>'+escapeHtml(amountDue)+'</td><td>'+escapeHtml(payout)+'</td><td><span class="creatorLedgerStatus '+(state==="authorized"?"authorized":state==="paid"?"paid":state==="reversed"?"reversed":"")+'">'+escapeHtml(creatorSalesStatusLabel(state))+'</span></td></tr>'}).join(""):'<tr><td class="creatorSalesEmpty" colspan="7">No orders have been attributed to this creator in this period.</td></tr>';
  }
  function closeCreatorSales(){const modal=$("creatorSalesModal");if(modal)modal.hidden=true}
  async function openCreatorSales(id,name,period="30d"){
    const modal=$("creatorSalesModal"),body=$("creatorSalesRows");
    if(!modal||!body)return;
    activeCreatorSales={id,name,period};modal.hidden=false;
    document.querySelectorAll("[data-creator-sales-period]").forEach(button=>button.classList.toggle("active",button.dataset.creatorSalesPeriod===period));
    setText("creatorSalesTitle",(name||"Creator")+" Sales");
    ["creatorSalesOrders","creatorSalesAuthorized","creatorSalesRevenue","creatorSalesCommission","creatorSalesDueFirst","creatorSalesDueFifteenth"].forEach(key=>setText(key,"—"));
    body.innerHTML='<tr><td class="creatorSalesEmpty" colspan="7">Loading creator activity…</td></tr>';
    try{
      const data=await request("/api/store-owner/creator-applications/"+encodeURIComponent(id)+"/sales?period="+encodeURIComponent(period));renderCreatorSales(data);
    }catch(error){body.innerHTML='<tr><td class="creatorSalesEmpty" colspan="7">'+escapeHtml(error?.message||"Creator sales could not be loaded.")+'</td></tr>'}
  }
  function renderCreatorNetwork(rows){
    const apps=(Array.isArray(rows)?rows:[]).map(application=>({application,person:creatorPerson(application)}));
    const incoming=apps.filter(x=>["new","verifying"].includes(x.person.status));
    const selected=apps.filter(x=>x.person.status==="approved");
    const ranked=selected.filter(x=>x.person.visits>0||x.person.orders>0||x.person.sales>0).sort((a,b)=>(b.person.sales-a.person.sales)||(b.person.orders-a.person.orders)||(b.person.visits-a.person.visits)).slice(0,10);
    setText("creatorIncomingCount",number(incoming.length));setText("creatorSelectedCount",number(selected.length));setText("creatorRankedCount",number(ranked.length));
    const incomingIds=new Set(incoming.map(({person})=>person.id));selectedCreatorApplicationIds.forEach(id=>{if(!incomingIds.has(id))selectedCreatorApplicationIds.delete(id)});
    const ib=$("creatorIncomingRows");
    if(ib)ib.innerHTML=incoming.length?incoming.map(({application,person:p})=>'<tr><td class="creatorSelectCell"><input class="creatorSelect" type="checkbox" data-creator-select="'+escapeHtml(p.id)+'" aria-label="Select '+escapeHtml(p.name)+'" '+(selectedCreatorApplicationIds.has(p.id)?"checked":"")+'></td><td>'+creatorIdentity(p)+'</td><td><div class="creatorApplied">'+escapeHtml(p.submittedDate)+'<span>'+escapeHtml(p.submittedTime)+'</span></div></td><td>'+escapeHtml(p.location)+'</td><td><a class="creatorLink" href="https://wa.me/'+encodeURIComponent(p.phoneDigits)+'" target="_blank" rel="noopener">WhatsApp</a></td><td><div class="creatorLinks">'+creatorProfileLinks(p)+'</div></td><td><div class="creatorSource">'+escapeHtml(application.heard_about||"—")+'</div></td><td><span class="creatorStatus">'+escapeHtml(p.status)+"</span></td><td><div class=\"creatorActions\">"+creatorAction(p.id,"verifying","Reviewing")+creatorAction(p.id,"approved","Approve","primary")+"</div></td></tr>").join(""):'<tr><td class="creatorEmpty" colspan="9">New applications will appear here automatically.</td></tr>';
    updateCreatorDeleteControls();
    const sb=$("creatorSelectedRows");
    if(sb)sb.innerHTML=selected.length?selected.map(({person:p})=>{const link=creatorReferralUrl(p.slug);const state=p.onboardingStatus==="active"?"Active":p.onboardingStatus==="invited"?"Invitation sent":"Pending";return'<article class="creatorApprovedCard is-collapsed"><div class="creatorApprovedTop"><div class="creatorApprovedIdentity">'+creatorIdentity(p)+'<span class="creatorApprovedLocation">'+escapeHtml(p.location)+'</span></div><div class="creatorApprovedTopActions"><span class="creatorStatus">'+escapeHtml(state)+'</span><button class="creatorApprovedToggle" type="button" data-toggle-approved-creator aria-expanded="false" aria-label="Show creator details"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div><div class="creatorApprovedDetails"><div class="creatorApprovedLink"><code>'+escapeHtml(link)+'</code><button class="creatorAction" type="button" data-copy-creator-link="'+escapeHtml(link)+'">Copy link</button></div><div class="creatorApprovedMeta"><span><b>Payment</b>'+escapeHtml(p.payoutMethod?p.payoutMethod.toUpperCase()+" · "+p.payoutDestination:"Not provided")+'</span><span><b>Agreement</b>'+escapeHtml(p.agreementAccepted)+(p.agreementVersion?" · v"+escapeHtml(p.agreementVersion):"")+'</span></div><div class="creatorApprovedBottom"><div class="creatorPerformance"><strong>'+money(p.sales)+'</strong><span>'+number(p.orders)+' paid orders</span><button class="creatorAction primary" type="button" data-creator-sales-id="'+escapeHtml(p.id)+'" data-creator-sales-name="'+escapeHtml(p.name)+'">View Sales</button></div><div class="creatorPlan"><div class="creatorPlanLabel"><span>Commission plan</span><strong>Tier '+number(p.tier)+' · '+number(p.commissionRate)+'%</strong></div><div class="creatorTierControls">'+[1,2,3].map(tier=>'<button class="creatorAction '+(p.tier===tier?'primary':'')+'" type="button" data-creator-id="'+escapeHtml(p.id)+'" data-creator-status="approved" data-creator-tier="'+tier+'">Tier '+tier+'</button>').join("")+'</div></div></div><div class="creatorApprovedFooter"><button class="creatorAction primary" type="button" data-creator-mark-paid="'+escapeHtml(p.id)+'">Mark due commissions paid</button>'+creatorAction(p.id,"declined","Deactivate creator","danger")+'</div></div></article>'}).join(""):'<div class="creatorApprovedEmpty">Approved creators will appear here.</div>';
    if(sb)[...sb.querySelectorAll(".creatorApprovedCard")].forEach((card,index)=>{
      const entry=selected[index],person=entry?.person,application=entry?.application,meta=card.querySelector(".creatorApprovedMeta");
      if(meta){const payout=document.createElement("span"),label=document.createElement("b");label.textContent="Amount due";payout.append(label,document.createTextNode(money(application?.commission_due||0)+(application?.next_payout_at?" · "+creatorSalesDate(application.next_payout_at):"")));meta.append(payout)}
      if(person?.onboardingStatus!=="invited")return;
      const footer=card.querySelector(".creatorApprovedFooter"),button=document.createElement("button");button.className="creatorAction";button.type="button";button.dataset.creatorResendInvite=person.id;button.textContent="Resend invitation";footer?.prepend(button)
    });
    const rb=$("creatorRankingRows");if(rb)rb.innerHTML=ranked.length?ranked.map(({person:p},i)=>'<tr><td><span class="creatorRank">'+(i+1)+'</span></td><td>'+creatorIdentity(p)+'</td><td>'+number(p.visits)+'</td><td>'+number(p.orders)+'</td><td>'+money(p.sales)+'</td><td>'+percent(p.conversion/100)+'</td></tr>').join(""):'<tr><td class="creatorEmpty" colspan="6">The Top 10 will appear when approved creators generate attributed activity.</td></tr>'
  }

  document.addEventListener("click",async event=>{
    const creatorToggle=event.target.closest("[data-toggle-approved-creator]");
    if(creatorToggle){const card=creatorToggle.closest(".creatorApprovedCard");const collapsed=card?.classList.toggle("is-collapsed");creatorToggle.setAttribute("aria-expanded",String(!collapsed));creatorToggle.setAttribute("aria-label",collapsed?"Show creator details":"Hide creator details");return}
    const sectionToggle=event.target.closest("[data-toggle-creator-section]");
    if(sectionToggle){const section=sectionToggle.closest(".creatorSection");const collapsed=section?.classList.toggle("is-collapsed");const label=sectionToggle.dataset.sectionLabel||"section";sectionToggle.setAttribute("aria-expanded",String(!collapsed));sectionToggle.setAttribute("aria-label",(collapsed?"Show ":"Hide ")+label);return}
    const salesModal=$("creatorSalesModal");
    if(event.target.closest("[data-close-creator-sales]")||event.target===salesModal){closeCreatorSales();return}
    const periodButton=event.target.closest("[data-creator-sales-period]");
    if(periodButton&&activeCreatorSales){await openCreatorSales(activeCreatorSales.id,activeCreatorSales.name,periodButton.dataset.creatorSalesPeriod||"30d");return}
    const salesButton=event.target.closest("[data-creator-sales-id]");
    if(salesButton){await openCreatorSales(salesButton.dataset.creatorSalesId,salesButton.dataset.creatorSalesName);return}
    const copyButton=event.target.closest("[data-copy-creator-link]");
    if(copyButton){await navigator.clipboard.writeText(copyButton.dataset.copyCreatorLink||"");copyButton.textContent="Copied";setTimeout(()=>copyButton.textContent="Copy",1200);return}
    const deleteButton=event.target.closest("[data-delete-selected-creators]");
    if(deleteButton){const ids=[...selectedCreatorApplicationIds];if(!ids.length)return;deleteButton.disabled=true;try{await Promise.all(ids.map(id=>request("/api/store-owner/creator-applications/"+encodeURIComponent(id),{method:"DELETE"})));selectedCreatorApplicationIds.clear();await load(true)}catch(error){window.alert(error?.message||"The selected applications could not be deleted.");updateCreatorDeleteControls()}return}
    const markPaidButton=event.target.closest("[data-creator-mark-paid]");
    if(markPaidButton){if(!window.confirm("Confirm that you already sent this creator's due payout?"))return;markPaidButton.disabled=true;try{const result=await request("/api/store-owner/creator-applications/"+encodeURIComponent(markPaidButton.dataset.creatorMarkPaid)+"/payouts/mark-paid",{method:"POST"});window.alert(result.paidCount?money(result.paidAmount)+" recorded as paid.":"No unpaid commissions were due.");await load(true)}catch(error){window.alert(error?.message||"The payout could not be recorded.")}finally{markPaidButton.disabled=false}return}
    const resendInviteButton=event.target.closest("[data-creator-resend-invite]");
    if(resendInviteButton){resendInviteButton.disabled=true;try{await request("/api/store-owner/creator-applications/"+encodeURIComponent(resendInviteButton.dataset.creatorResendInvite)+"/invitation",{method:"POST"});window.alert("Invitation sent.")}catch(error){window.alert(error?.message||"The invitation could not be resent.")}finally{resendInviteButton.disabled=false}return}
    const button=event.target.closest("[data-creator-status]");
    if(!button)return;
    const id=button.dataset.creatorId;
    const status=button.dataset.creatorStatus;
    const tier=Number(button.dataset.creatorTier||1);
    button.disabled=true;
    try{await request("/api/store-owner/creator-applications/"+encodeURIComponent(id),{method:"PATCH",body:{status,tier}});await load(true)}
    catch(error){window.alert(error?.message||"The creator could not be updated.")}
    finally{button.disabled=false}
  });

  document.addEventListener("change",event=>{
    if(event.target.id==="creatorSelectAll"){qsa("[data-creator-select]").forEach(box=>{box.checked=event.target.checked;if(box.checked)selectedCreatorApplicationIds.add(box.dataset.creatorSelect);else selectedCreatorApplicationIds.delete(box.dataset.creatorSelect)});updateCreatorDeleteControls();return}
    const box=event.target.closest("[data-creator-select]");if(!box)return;if(box.checked)selectedCreatorApplicationIds.add(box.dataset.creatorSelect);else selectedCreatorApplicationIds.delete(box.dataset.creatorSelect);updateCreatorDeleteControls()
  });

  function renderLive(realtime) {
    const rows = realtime?.sessions || [];
    setText("analyticsLiveCount", number(rows.length));
    const root = $("analyticsLiveRows");
    if (!root) return;
    root.innerHTML = rows.length ? rows.map(item =>
      '<div class="analyticsLiveRow">' +
        '<span class="analyticsSessionId">' + escapeHtml(String(item.sessionId || "").slice(-12)) + '</span>' +
        '<strong>' + escapeHtml(item.page || "home") + '</strong>' +
        '<span>' + escapeHtml(item.action || "Browsing") + (item.productName ? " · " + escapeHtml(item.productName) : "") + '</span>' +
        '<span>' + escapeHtml(item.city || "Unknown") + '</span>' +
        '<span>' + duration(item.timeOnSiteSeconds) + '</span>' +
      '</div>'
    ).join("") : '<div class="analyticsEmpty">No visitors are active right now. This updates automatically.</div>';
  }

  function renderCampaigns(campaigns) {
    const root = $("analyticsCampaigns");
    if (!root) return;
    const rows = Array.isArray(campaigns) ? campaigns : [];
    root.innerHTML = rows.length ? rows.map(item =>
      '<div class="analyticsCampaign">' +
        '<span class="analyticsCampaignChannel">' + escapeHtml(item.channel) + '</span>' +
        '<strong class="analyticsCampaignName">' + escapeHtml(item.campaign || "Untracked") + '</strong>' +
        '<span class="analyticsCampaignValue">' + number(item.sessions) + '</span>' +
        '<span class="analyticsCampaignRevenue">' + money(item.revenue) + '</span>' +
      '</div>'
    ).join("") : '<div class="analyticsEmpty">Campaign rows appear when ad links include UTM campaign values.</div>';
  }

  function populateSettings(settings) {
    if ($("analyticsMonth") && settings?.month) $("analyticsMonth").value = settings.month;
    [
      ["analyticsSpendWhatsapp", settings?.adSpendWhatsapp],
      ["analyticsSpendInstagram", settings?.adSpendInstagram],
      ["analyticsSpendTiktok", settings?.adSpendTiktok],
      ["analyticsInventoryInput", settings?.inventorySpend]
    ].forEach(([id, value]) => {
      const input = $(id);
      if (input && document.activeElement !== input) input.value = Number(value || 0);
    });
  }

  function render(data) {
    currentData = data;
    const overview = data.overview || {};
    setText("analyticsLiveVisitors", number(overview.liveVisitors));
    setText("analyticsViews", number(overview.productViews));
    setText("analyticsCart", number(overview.addToCart));
    setText("analyticsCheckouts", number(overview.checkouts));
    setText("analyticsPurchases", number(overview.purchases));
    setText("analyticsRevenue", money(overview.revenue));
    setText("analyticsRevenueMeta", money(overview.cardRevenue) + " card · " + money(overview.nequiRevenue) + " Nequi");
    setText("analyticsFavorites", number(overview.favorites));
    setText("analyticsShares", number(overview.shares));
    setText("analyticsConversion", percent(overview.conversionRate));
    setText("analyticsAov", money(overview.averageOrderValue));
    setText("analyticsAbandoned", number(overview.abandonedCarts));
    setText("analyticsGrowth", percent(overview.monthlyGrowth));
    setText("analyticsInventorySpend", money(overview.inventorySpend));
    setText("analyticsCogs", money(overview.costOfGoodsSold));
    setText("analyticsInventoryValue", money(overview.remainingInventoryValue));
    setText("analyticsGrossProfit", money(overview.grossProfit));
    setText("analyticsGrossMargin", percent(Number(overview.grossMarginPercent || 0) / 100) + " gross margin");
    setText("analyticsSessionTotal", number(overview.sessions));
    setText(
      "analyticsBusinessReadout",
      "Ad spend " + money(overview.adSpend) +
      " · CAC " + money(overview.customerAcquisitionCost) +
      " · Gross profit " + money(overview.grossProfit)
    );
    setText(
      "analyticsStatus",
      "Live · " + number(data.storage?.eventCount) + " stored events · updated " +
      new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(data.generatedAt))
    );
    drawTrend(data.timeseries || []);
    drawDonut(data.channels || []);
    renderFunnel(data.funnel || []);
    renderChannels(data.channels || []);
    renderProducts();
    renderCreatorNetwork(data.creatorApplications || []);
    renderHotProducts(data.hotProducts || []);
    renderLive(data.realtime || {});
    renderCampaigns(data.campaigns || []);
    populateSettings(data.settings || {});
  }

  async function load(force = false) {
    if (loading && !force) return;
    if (!token()) return;
    loading = true;
    $("analyticsRefresh")?.classList.add("loading");
    setText("analyticsStatus", "Refreshing live data…");
    try {
      const month = $("analyticsMonth")?.value || new Date().toISOString().slice(0, 7);
      render(await request("/api/store-owner/analytics?days=" + encodeURIComponent(days) + "&month=" + encodeURIComponent(month)));
    } catch (error) {
      setText("analyticsStatus", error?.message || "Analytics could not be loaded.");
    } finally {
      loading = false;
      $("analyticsRefresh")?.classList.remove("loading");
    }
  }

  function start() {
    stop();
    pollTimer = window.setInterval(() => {
      if ($("panel-analytics")?.classList.contains("active") && document.visibilityState === "visible") {
        load();
      }
    }, 8000);
  }

  function stop() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function refreshWhenVisible() {
    if ($("panel-analytics")?.classList.contains("active") && document.visibilityState === "visible") load(true);
  }

  window.addEventListener("focus", refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);

  async function saveSettings() {
    const button = $("analyticsSaveSettings");
    if (button) {
      button.disabled = true;
      button.textContent = "Saving…";
    }
    try {
      await request("/api/store-owner/analytics/settings", {
        method: "POST",
        body: {
          adSpendWhatsapp: Number($("analyticsSpendWhatsapp")?.value || 0),
          adSpendInstagram: Number($("analyticsSpendInstagram")?.value || 0),
          adSpendTiktok: Number($("analyticsSpendTiktok")?.value || 0),
          inventorySpend: Number($("analyticsInventoryInput")?.value || 0)
          ,month: $("analyticsMonth")?.value || new Date().toISOString().slice(0, 7)
        }
      });
      await load(true);
    } catch (error) {
      setText("analyticsStatus", error?.message || "Business inputs could not be saved.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Save Monthly Inputs";
      }
    }
  }

  if ($("analyticsMonth")) {
    $("analyticsMonth").value = new Date().toISOString().slice(0, 7);
    $("analyticsMonth").addEventListener("change", () => load(true));
  }
  qsa("[data-range-days]").forEach(button => {
    button.addEventListener("click", () => {
      days = Number(button.dataset.rangeDays || 30);
      qsa("[data-range-days]").forEach(candidate => candidate.classList.toggle("active", candidate === button));
      load(true);
    });
  });
  qsa("[data-product-sort]").forEach(header => {
    header.addEventListener("click", () => {
      sortKey = header.dataset.productSort || "overall";
      sortDirection = header.dataset.sortDirection || "desc";
      renderProducts();
    });
  });
  $("analyticsMetricFilter")?.addEventListener("change", event => {
    sortKey = event.target.value || "overall";
    productPage = 1;
    renderProducts();
  });
  $("analyticsOrderFilter")?.addEventListener("change", event => {
    sortDirection = event.target.value === "asc" ? "asc" : "desc";
    productPage = 1;
    renderProducts();
  });
  qsa("[data-page-size]").forEach(button => button.addEventListener("click", () => { productPageSize = Number(button.dataset.pageSize || 10); productPage = 1; renderProducts(); }));
  $("analyticsPreviousPage")?.addEventListener("click", () => { if (productPage > 1) { productPage -= 1; renderProducts(); } });
  $("analyticsNextPage")?.addEventListener("click", () => { productPage += 1; renderProducts(); });
  $("analyticsRefresh")?.addEventListener("click", () => load(true));
  $("analyticsSaveSettings")?.addEventListener("click", saveSettings);

  function organizeMetrics() {
    const root = $("analyticsKpis");
    if (!root || root.dataset.organized) return;
    root.dataset.organized = "true";
    root.className = "analyticsMetricGroups";
    const groups = [
      ["Sales and Revenue", ["analyticsPurchases", "analyticsRevenue", "analyticsAov", "analyticsGrowth"]]
    ];
    const visibleMetricIds = new Set(groups.flatMap(([, ids]) => ids));
    root.querySelectorAll(":scope > .analyticsKpi").forEach(card => {
      const value = card.querySelector("[id]");
      if (!value || !visibleMetricIds.has(value.id)) card.style.display = "none";
    });
    groups.forEach(([label, ids], index) => {
      const details = document.createElement("details");
      details.className = "analyticsMetricGroup";
      if (index < 2) details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = label;
      const grid = document.createElement("div");
      grid.className = "analyticsMetricGroupGrid";
      ids.forEach(id => {
        const card = $(id)?.closest(".analyticsKpi");
        if (card) grid.appendChild(card);
      });
      details.append(summary, grid);
      root.appendChild(details);
    });
  }
  organizeMetrics();

  function renderChat(data) {
    const selfAdmin = data.self === "admin";
    setText("chatHead", selfAdmin ? "Karolay" : "Reign");
    const presence = $("chatPeerPresence");
    if (presence) {
      presence.textContent = data.peerActive ? "Active" : "Inactive";
      presence.classList.toggle("active", Boolean(data.peerActive));
    }
    const root = $("chatMessages");
    if (!root) return;
    const peerMessages = (data.messages || []).filter(item => item.sender !== data.self);
    const newestPeer = peerMessages[peerMessages.length - 1];
    if (!chatOpen && newestPeer?.id && newestPeer.id !== lastPeerMessageId) {
      const badge = $("chatUnread");
      if (badge) {
        badge.hidden = false;
        badge.textContent = "1";
      }
    }
    if (newestPeer?.id) lastPeerMessageId = newestPeer.id;
    root.innerHTML = (data.messages || []).map(item =>
      '<div class="chatMessage ' + (item.sender === data.self ? 'mine' : '') + '">' +
      escapeHtml(item.message) + '<time>' +
      new Intl.DateTimeFormat("en-US", {hour:"numeric",minute:"2-digit"}).format(new Date(item.sentAt)) +
      '</time></div>'
    ).join("") || '<div class="analyticsEmpty">No messages yet.</div>';
    root.scrollTop = root.scrollHeight;
  }

  async function loadChat() {
    if (!token()) return;
    try {
      renderChat(await request("/api/store-owner/chat"));
      setText("chatStatus", "");
    } catch (error) {
      setText("chatStatus", error?.message || "Chat could not be loaded.");
    }
  }

  $("chatComposer")?.addEventListener("submit", async event => {
    event.preventDefault();
    const input = $("chatInput");
    const message = String(input?.value || "").trim();
    if (!message) return;
    try {
      const data = await request("/api/store-owner/chat", {method:"POST", body:{message}});
      if (input) input.value = "";
      renderChat(data);
      setText("chatStatus", "");
    } catch (error) {
      setText("chatStatus", error?.message || "Message was not sent.");
    }
  });
  $("chatBubble")?.addEventListener("click", () => {
    chatOpen = !chatOpen;
    $("chatShell")?.classList.toggle("open", chatOpen);
    if (chatOpen) {
      if ($("chatUnread")) $("chatUnread").hidden = true;
      loadChat();
      $("chatInput")?.focus();
    }
  });
  clearInterval(chatTimer);
  chatTimer = setInterval(loadChat, 8000);
  window.addEventListener("focus", loadChat);
  window.addEventListener("storage", loadChat);
  setTimeout(() => {
    loadChat();
  }, 1000);
  window.addEventListener("resize", () => {
    clearTimeout(window.__cajaAnalyticsResize);
    window.__cajaAnalyticsResize = window.setTimeout(() => {
      if (currentData) {
        drawTrend(currentData.timeseries || []);
        drawDonut(currentData.channels || []);
      }
    }, 120);
  });

  window.CajaModaAdminAnalytics = { load, start, stop };
})();
