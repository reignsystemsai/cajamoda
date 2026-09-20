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
  let creatorMarketingAssets = [];
  let creatorMarketingLoaded = false;
  let creatorMarketingFilter = "reel";
  let creatorMarketingSearch = "";
  const marketingPlaceholderAssets = [
    {id:"placeholder-featured",asset_type:"reel",title:"Your best version, every day.",suggested_text:"Style that goes with you. Discover what's new at CajaModa.",media_url:"/assets/marketing-placeholders/featured-reel.webp",status:"active",placeholder:true},
    {id:"placeholder-handbag",asset_type:"photo",title:"Details that make you fall in love.",suggested_text:"Elegance is in the details.",media_url:"/assets/marketing-placeholders/handbag.webp",status:"active",placeholder:true},
    {id:"placeholder-story",asset_type:"story",title:"Always with you.",suggested_text:"Real fashion for real women.",media_url:"/assets/marketing-placeholders/story.webp",status:"active",placeholder:true},
    {id:"placeholder-white",asset_type:"photo",title:"Style in every step.",suggested_text:"Looks that speak about you.",media_url:"/assets/marketing-placeholders/white-look.webp",status:"active",placeholder:true},
    {id:"placeholder-accessories",asset_type:"photo",title:"Accessories that complete.",suggested_text:"Small details, big stories.",media_url:"/assets/marketing-placeholders/accessories.webp",status:"active",placeholder:true},
    {id:"placeholder-black",asset_type:"reel",title:"Confidence in motion.",suggested_text:"Fashion that lives.",media_url:"/assets/marketing-placeholders/black-look.webp",status:"active",placeholder:true},
    {id:"placeholder-rack",asset_type:"photo",title:"Fashion for real life.",suggested_text:"Essentials that always work.",media_url:"/assets/marketing-placeholders/clothing-rack.webp",status:"active",placeholder:true}
  ];

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

  function creatorPerson(a){const f=String(a?.first_name||""),l=String(a?.last_name||""),instagram=String(a?.instagram_username||"").replace(/^@/,""),tiktok=String(a?.tiktok_username||"").replace(/^@/,""),phoneDigits=String(a?.phone||"").replace(/\D/g,""),submittedDate=a?.created_at?new Date(a.created_at):null,validSubmitted=submittedDate&&!Number.isNaN(submittedDate.getTime()),agreementDate=a?.agreement_accepted_at?new Date(a.agreement_accepted_at):null,validAgreement=agreementDate&&!Number.isNaN(agreementDate.getTime());return{id:String(a?.id||""),name:(f+" "+l).trim()||"Creadora CajaModa",email:String(a?.email||""),location:[a?.city,a?.department].filter(Boolean).join(", ")||"—",instagram,tiktok,phoneDigits,initials:(f.slice(0,1)+l.slice(0,1)).toUpperCase()||"CM",profilePhotoUrl:String(a?.profile_photo_url||a?.profilePhotoUrl||""),submittedDate:validSubmitted?new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeZone:"America/Bogota"}).format(submittedDate):"—",submittedTime:validSubmitted?new Intl.DateTimeFormat("es-CO",{timeStyle:"short",timeZone:"America/Bogota"}).format(submittedDate)+" COT":"—",status:String(a?.status||"new"),onboardingStatus:String(a?.onboarding_status||""),slug:String(a?.creator_slug||""),tier:Number(a?.tier||0),commissionRate:Number(a?.commission_rate||0),agreementVersion:String(a?.agreement_version||""),agreementAccepted:validAgreement?new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Bogota"}).format(agreementDate)+" COT":"Sin firmar",payoutMethod:String(a?.payout_account?.method||""),payoutDestination:String(a?.payout_account?.destination||a?.payout_account?.destination_masked||"No proporcionado"),visits:Number(a?.visits||a?.analytics?.visits||0),orders:Number(a?.paid_orders||a?.analytics?.paid_orders||0),sales:Number(a?.sales_total||a?.analytics?.sales_total||0),conversion:Number(a?.conversion_rate||a?.analytics?.conversion_rate||0),qualifiedSales:Number(a?.qualified_creator_sales||0),nextMilestone:Number(a?.next_milestone||0),amountRemaining:Number(a?.amount_remaining||0),unboxingStatus:String(a?.unboxing_status||"locked"),creatorDiscount:Number(a?.creator_discount_percent||0),cityEligible:Boolean(a?.city_campaign_eligible),leadershipEligible:Boolean(a?.leadership_event_eligible)}}
  function creatorProfileLinks(p){return[p.instagram?'<a class="creatorLink" href="https://www.instagram.com/'+encodeURIComponent(p.instagram)+'" target="_blank" rel="noopener">Instagram</a>':"",p.tiktok?'<a class="creatorLink" href="https://www.tiktok.com/@'+encodeURIComponent(p.tiktok)+'" target="_blank" rel="noopener">TikTok</a>':""].filter(Boolean).join("")}
  function creatorIdentity(p,hideEmail=false){const activeClass=p.orders>0||p.sales>0?' activeSeller':'',avatar=p.profilePhotoUrl?'<span class="creatorApplicantAvatar hasPhoto'+activeClass+'"><img src="'+escapeHtml(p.profilePhotoUrl)+'" alt=""></span>':'<span class="creatorApplicantAvatar'+activeClass+'"></span>';return'<div class="creatorApplicant">'+avatar+'<div><strong>'+escapeHtml(p.name)+'</strong>'+(hideEmail?'':'<span>'+escapeHtml(p.email)+'</span>')+'</div></div>'}
  function creatorReferralUrl(slug){return "https://www.cajamoda.com/"+encodeURIComponent(slug)}
  function creatorAction(id,status,label,className=""){return'<button class="creatorAction '+className+'" type="button" data-creator-id="'+escapeHtml(id)+'" data-creator-status="'+escapeHtml(status)+'">'+escapeHtml(label)+'</button>'}
  function creatorTierActions(p){return'<div class="creatorActions">'+[1,2,3,4,5].map(tier=>'<button class="creatorAction '+(p.tier===tier?'primary':'')+'" type="button" data-creator-id="'+escapeHtml(p.id)+'" data-creator-status="approved" data-creator-tier="'+tier+'">Nivel '+tier+' · '+(tier*10)+'%</button>').join("")+'</div>'}
  function creatorProductsSold(products){const rows=Array.isArray(products)?products:[];return rows.length?rows.map(item=>{const name=item?.productName||item?.name||"Producto";const quantity=Math.max(1,Number(item?.quantity||1));const size=item?.size||item?.selectedSize||"";return escapeHtml(name)+" × "+number(quantity)+(size?" · "+escapeHtml(size):"")}).join("<br>"):"—"}
  let activeCreatorSales=null;
  const selectedCreatorApplicationIds=new Set();
  function updateCreatorDeleteControls(){const boxes=qsa("[data-creator-select]");const selected=boxes.filter(box=>box.checked);const selectAll=$("creatorSelectAll"),button=$("creatorDeleteSelected");if(selectAll){selectAll.checked=boxes.length>0&&selected.length===boxes.length;selectAll.indeterminate=selected.length>0&&selected.length<boxes.length}if(button){button.disabled=selected.length===0;button.textContent=selected.length?"Eliminar seleccionadas ("+selected.length+")":"Eliminar seleccionadas"}}
  function creatorSalesDate(value){if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?"—":new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeZone:"America/Bogota"}).format(date)}
  function creatorSalesStatusLabel(value){const status=String(value||"earned").toLowerCase();if(status==="authorized")return"Autorizado";if(status==="paid")return"Pagado";if(status==="reversed")return"Revertido";return"Comisión obtenida"}
  function creatorApplicationStatus(value){return({new:"Nueva",verifying:"En revisión",approved:"Aprobada",declined:"Rechazada"}[String(value||"").toLowerCase()]||String(value||""))}
  function renderCreatorSalesChart(series){
    const chart=$("creatorSalesChart");if(!chart)return;
    const values=(Array.isArray(series)?series:[]).map(point=>({date:String(point?.date||""),value:Math.max(0,Number(point?.value||0))})).filter(point=>point.date);
    const width=760,height=220,left=52,right=18,top=16,bottom=34,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maximum=Math.max(1,...values.map(point=>point.value));
    const grid=Array.from({length:5},(_,index)=>{const y=top+(plotHeight/4)*index;const value=maximum-(maximum/4)*index;return'<line class="creatorSalesChartGrid" x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'"></line><text class="creatorSalesChartLabel" x="'+(left-8)+'" y="'+(y+3)+'" text-anchor="end">'+escapeHtml(number(value))+'</text>'}).join("");
    if(!values.length){chart.innerHTML='<defs><linearGradient id="creatorSalesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d58aa5" stop-opacity=".28"/><stop offset="1" stop-color="#d58aa5" stop-opacity="0"/></linearGradient></defs>'+grid+'<text class="creatorSalesChartLabel" x="380" y="112" text-anchor="middle">No hay ventas pagadas en este período</text>';return}
    const points=values.map((point,index)=>{const x=values.length===1?left+plotWidth/2:left+(plotWidth*index)/(values.length-1);const y=top+plotHeight-(point.value/maximum)*plotHeight;return{x,y,...point}});
    const path=points.map((point,index)=>(index?"L":"M")+point.x.toFixed(1)+" "+point.y.toFixed(1)).join(" ");
    const area=path+" L "+points.at(-1).x.toFixed(1)+" "+(top+plotHeight)+" L "+points[0].x.toFixed(1)+" "+(top+plotHeight)+" Z";
    const labels=points.map((point,index)=>index===0||index===points.length-1||index===Math.floor(points.length/2)?'<text class="creatorSalesChartLabel" x="'+point.x+'" y="'+(height-10)+'" text-anchor="middle">'+escapeHtml(creatorSalesDate(point.date))+'</text>':"").join("");
    const dots=points.map(point=>'<circle class="creatorSalesChartDot" cx="'+point.x+'" cy="'+point.y+'" r="4"></circle>').join("");
    chart.innerHTML='<defs><linearGradient id="creatorSalesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d58aa5" stop-opacity=".28"/><stop offset="1" stop-color="#d58aa5" stop-opacity="0"/></linearGradient></defs>'+grid+'<path class="creatorSalesChartArea" d="'+area+'"></path><path class="creatorSalesChartLine" d="'+path+'"></path>'+dots+labels;
  }
  function renderCreatorSales(data){
    const creator=data?.creator||{},totals=data?.totals||{},activity=data?.activity||{},ledger=Array.isArray(data?.ledger)?data.ledger:[];
    const fullName=[creator.firstName,creator.lastName].filter(Boolean).join(" ")||activeCreatorSales?.name||"Creadora";
    const initials=[creator.firstName,creator.lastName].filter(Boolean).map(value=>String(value).slice(0,1)).join("").toUpperCase()||"CM";
    setText("creatorSalesTitle",fullName);const avatar=$("creatorSalesAvatar");if(avatar){avatar.textContent="";avatar.style.backgroundImage=creator.profilePhotoUrl?'url("'+String(creator.profilePhotoUrl).replace(/"/g,"%22")+'")':"";avatar.classList.toggle("hasPhoto",Boolean(creator.profilePhotoUrl));avatar.classList.toggle("activeSeller",Number(totals.orders||0)>0||Number(totals.grossSales||totals.productSales||0)>0)}setText("creatorSalesLink","cajamoda.com/"+(creator.slug||""));setText("creatorSalesTier","Nivel "+number(creator.tier)+" · "+number(creator.commissionRate)+"% de comisión");
    const status=$("creatorSalesAccountStatus");if(status){status.textContent=String(creator.status||"inactive").toLowerCase()==="active"?"Activa":"Desactivada";status.classList.toggle("inactive",String(creator.status||"").toLowerCase()!=="active")}
    setText("creatorSalesRevenue",money(totals.grossSales??totals.productSales));setText("creatorSalesOrders",number(totals.orders));setText("creatorSalesAuthorized",number(totals.authorizedOrders));setText("creatorSalesCommission",money(totals.commission));setText("creatorSalesDueFirst",money(totals.dueOnFirst));setText("creatorSalesDueFifteenth",money(totals.dueOnFifteenth));
    setText("creatorActivityVisits",number(activity.visits));setText("creatorActivityViews",number(activity.productViews));setText("creatorActivityLikes",number(activity.likes));setText("creatorActivityShares",number(activity.shares));setText("creatorActivityFavorites",number(activity.favorites));setText("creatorActivityCarts",number(activity.carts));setText("creatorActivityCheckouts",number(activity.checkouts));setText("creatorActivityConversion",percent(activity.conversion));
    renderCreatorSalesChart(data?.series);
    const body=$("creatorSalesRows");if(!body)return;
    body.innerHTML=ledger.length?ledger.map(sale=>{const state=String(sale.status||"earned").toLowerCase();const amountDue=state==="authorized"?"Captura pendiente":money(sale.amountDue);const payout=creatorSalesDate(sale.payoutDate);const economics=value=>sale.costKnown===false?"Costo no disponible":money(value);return'<tr><td>'+escapeHtml(creatorSalesDate(sale.orderDate))+'</td><td class="creatorSalesProducts">'+creatorProductsSold(sale.products)+'</td><td>'+money(sale.salePrice??sale.orderTotal)+'</td><td>'+economics(sale.productCost)+'</td><td>'+money(sale.packaging)+'</td><td>'+money(sale.operationFee)+'</td><td>'+economics(sale.commissionBase)+'</td><td>'+number(sale.commissionRate)+'% · '+economics(sale.commissionAmount)+'</td><td>'+economics(sale.margin)+'</td><td>'+escapeHtml(amountDue)+'</td><td>'+escapeHtml(payout)+'</td><td><span class="creatorLedgerStatus '+(state==="authorized"?"authorized":state==="paid"?"paid":state==="reversed"?"reversed":"")+'">'+escapeHtml(creatorSalesStatusLabel(state))+'</span></td></tr>'}).join(""):'<tr><td class="creatorSalesEmpty" colspan="12">No hay pedidos atribuidos a esta creadora en este período.</td></tr>';
  }
  function closeCreatorSales(){const modal=$("creatorSalesModal");if(modal)modal.hidden=true}
  async function openCreatorSales(id,name,period="30d"){
    const modal=$("creatorSalesModal"),body=$("creatorSalesRows");
    if(!modal||!body)return;
    activeCreatorSales={id,name,period};modal.hidden=false;
    document.querySelectorAll("[data-creator-sales-period]").forEach(button=>button.classList.toggle("active",button.dataset.creatorSalesPeriod===period));
    setText("creatorSalesTitle","Ventas de "+(name||"la creadora"));
    ["creatorSalesOrders","creatorSalesAuthorized","creatorSalesRevenue","creatorSalesCommission","creatorSalesDueFirst","creatorSalesDueFifteenth"].forEach(key=>setText(key,"—"));
    body.innerHTML='<tr><td class="creatorSalesEmpty" colspan="12">Cargando actividad de la creadora…</td></tr>';
    try{
      const data=await request("/api/store-owner/creator-applications/"+encodeURIComponent(id)+"/sales?period="+encodeURIComponent(period));renderCreatorSales(data);
    }catch(error){body.innerHTML='<tr><td class="creatorSalesEmpty" colspan="12">'+escapeHtml(error?.message||"No se pudieron cargar las ventas de la creadora.")+'</td></tr>'}
  }
  function readAssetFile(input){const file=input?.files?.[0];if(!file)return Promise.resolve({data:null,name:null});return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({data:reader.result,name:file.name});reader.onerror=()=>reject(new Error("The selected file could not be read."));reader.readAsDataURL(file)})}
  function marketingTypeLabel(asset){return asset.asset_type==="reel"?"REEL 9:16":asset.asset_type==="story"?"STORY 9:16":"PHOTO 4:5"}
  function marketingFileName(asset){const extension=asset.placeholder?"webp":asset.asset_type==="reel"||asset.asset_type==="story"?"mp4":"jpg";return String(asset.title||"cajamoda-content").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"."+extension}
  function marketingAssetsForDisplay(){return creatorMarketingAssets.length?creatorMarketingAssets:marketingPlaceholderAssets}
  function marketingOrder(asset){return Number.isFinite(Number(asset?.display_order))?Number(asset.display_order):999}
  function marketingAssetBody(asset,overrides={}){return{title:asset.title,assetType:asset.asset_type,suggestedText:asset.suggested_text,relatedProductName:asset.related_product_name,relatedProductUrl:asset.related_product_url,campaign:asset.campaign||"",city:asset.city||"",minimumTier:asset.minimum_tier||1,startAt:asset.start_at||null,endAt:asset.end_at||null,status:asset.status||"active",displayOrder:marketingOrder(asset),...overrides}}
  function nextMarketingOrder(type){const rows=creatorMarketingAssets.filter(asset=>asset.asset_type===type);return rows.length?Math.max(...rows.map(marketingOrder).filter(Number.isFinite))+1:1}
  function isNewMarketingAsset(asset){if(asset.placeholder)return true;const stamp=new Date(asset.created_at||asset.updated_at||0).getTime();return stamp>0&&Date.now()-stamp<=604800000}
  function renderMarketingAssets(){
    const root=$("creatorMarketingAssets");if(!root)return;
    const query=creatorMarketingSearch.trim().toLowerCase();
    const real=creatorMarketingAssets.filter(asset=>asset.asset_type===creatorMarketingFilter).sort((a,b)=>marketingOrder(a)-marketingOrder(b));
    const samples=real.length?[]:marketingPlaceholderAssets.filter(asset=>asset.asset_type===creatorMarketingFilter);
    const matching=[...real,...samples].filter(asset=>!query||[asset.title,asset.suggested_text,asset.related_product_name].some(value=>String(value||"").toLowerCase().includes(query))).slice(0,9);
    const slots=query?matching:[...matching,...Array(Math.max(0,9-matching.length)).fill(null)];
    root.innerHTML=slots.map((asset,index)=>{const order=index+1;if(!asset)return'<article class="creatorMarketingCard creatorMarketingEmpty" data-type="'+escapeHtml(creatorMarketingFilter)+'" data-upload-slot="'+order+'"><div class="creatorMarketingSlotHead"><span>Slot '+order+'</span><small>'+escapeHtml(marketingTypeLabel({asset_type:creatorMarketingFilter}))+'</small></div><button class="creatorMarketingPreview" type="button" data-upload-slot="'+order+'" data-upload-type="'+escapeHtml(creatorMarketingFilter)+'" aria-label="Upload content to slot '+order+'"></button></article>';const media=asset.thumbnail_url||asset.media_url,isVideo=asset.asset_type==="reel"||asset.asset_type==="story",video=!asset.placeholder&&isVideo&&!asset.thumbnail_url,preview=media?(video?'<video src="'+escapeHtml(media)+'" muted playsinline preload="metadata"></video>':'<img src="'+escapeHtml(media)+'" alt="'+escapeHtml(asset.title||"Marketing content")+'">'):'<span>'+escapeHtml(marketingTypeLabel(asset))+'</span>',draggable=asset.placeholder?'false':'true';return'<article class="creatorMarketingCard" data-type="'+escapeHtml(asset.asset_type)+'" data-asset-id="'+escapeHtml(asset.id)+'" draggable="'+draggable+'"><div class="creatorMarketingSlotHead"><button class="creatorMarketingDrag" type="button" aria-label="Drag slot '+order+'">⠿</button><span>'+order+'</span><small>'+escapeHtml(asset.placeholder?"Sample":asset.status==="active"?"Published":"Draft")+'</small></div><button class="creatorMarketingPreview '+(isVideo?'is-video':'')+'" type="button" data-preview-asset="'+escapeHtml(asset.id)+'">'+preview+'</button><div class="creatorMarketingCopy"><h3>'+escapeHtml(asset.title||"Untitled content")+'</h3><div class="creatorMarketingDescription">'+escapeHtml(asset.suggested_text||"Ready for a caption when you are.")+'</div><div class="creatorMarketingActions">'+(asset.media_url?'<button class="creatorAction download" type="button" data-download-asset="'+escapeHtml(asset.id)+'">Download</button>':'')+'<button class="creatorAction" type="button" data-replace-asset="'+escapeHtml(asset.id)+'" data-slot="'+order+'">Replace</button>'+(asset.placeholder?'':'<button class="creatorAction primary" type="button" data-toggle-asset="'+escapeHtml(asset.id)+'" data-asset-status="'+(asset.status==="active"?"inactive":"active")+'">'+(asset.status==="active"?"Unpublish":"Publish")+'</button><button class="creatorAction danger" type="button" data-delete-asset="'+escapeHtml(asset.id)+'">Delete</button>')+'</div></div></article>'}).join("")||'<div class="creatorApprovedEmpty">No content matches this search.</div>'
    root.querySelectorAll(".creatorMarketingEmpty").forEach(card=>{const order=card.dataset.uploadSlot||"";card.insertAdjacentHTML("beforeend",'<div class="creatorMarketingCopy creatorMarketingEmptyCopy"><h3>Empty slot</h3><div class="creatorMarketingDescription">Ready for your next upload</div><div class="creatorMarketingActions"><button class="creatorAction download" type="button" disabled>Download</button><button class="creatorAction" type="button" data-upload-slot="'+escapeHtml(order)+'" data-upload-type="'+escapeHtml(creatorMarketingFilter)+'">Replace</button></div></div>')});
  }
  function openMarketingPreview(asset){const modal=$("marketingPreviewModal"),media=$("marketingPreviewMedia");if(!modal||!media||!asset)return;const video=!asset.placeholder&&(asset.asset_type==="reel"||asset.asset_type==="story");media.innerHTML=asset.media_url?(video?'<video src="'+escapeHtml(asset.media_url)+'" controls autoplay playsinline></video>':'<img src="'+escapeHtml(asset.media_url)+'" alt="'+escapeHtml(asset.title||"Marketing content")+'">'):'<span>No media uploaded</span>';setText("marketingPreviewType",marketingTypeLabel(asset));setText("marketingPreviewTitle",asset.title||"Content preview");setText("marketingPreviewText",asset.suggested_text||"No caption added.");const actions=$("marketingPreviewActions");if(actions)actions.innerHTML=(asset.media_url?'<button class="creatorAction download" type="button" data-download-asset="'+escapeHtml(asset.id)+'">Download '+(asset.asset_type==="photo"?"photo":"reel")+'</button>':'')+(asset.suggested_text?'<button class="creatorAction" type="button" data-copy-marketing-text="'+encodeURIComponent(asset.suggested_text)+'">Copy caption</button>':'');modal.hidden=false}
  function closeMarketingPreview(){const modal=$("marketingPreviewModal");if(!modal)return;modal.hidden=true;const video=modal.querySelector("video");if(video)video.pause()}
  async function downloadMarketingAsset(asset){if(!asset?.media_url)return;try{const response=await fetch(asset.media_url);if(!response.ok)throw new Error();const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=marketingFileName(asset);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{window.open(asset.media_url,"_blank","noopener")}}
  async function loadMarketingAssets(){try{const data=await request("/api/store-owner/creator-marketing-assets");creatorMarketingAssets=Array.isArray(data.assets)?data.assets:[];creatorMarketingLoaded=true;renderMarketingAssets()}catch(error){const root=$("creatorMarketingAssets");if(root)root.innerHTML='<div class="creatorApprovedEmpty">'+escapeHtml(error.message)+'</div>'}}
  function resetAssetForm(){const form=$("creatorAssetForm");form?.reset();if($("creatorAssetId"))$("creatorAssetId").value="";if($("creatorAssetOrder"))$("creatorAssetOrder").value="0";if(form)form.hidden=true}
  function fillAssetForm(asset){const form=$("creatorAssetForm");if(!form)return;form.hidden=false;$("creatorAssetId").value=asset?.placeholder?"":asset?.id||"";$("creatorAssetOrder").value=asset?.display_order??asset?.slot??nextMarketingOrder(asset?.asset_type||creatorMarketingFilter);$("creatorAssetTitle").value=asset?.placeholder?"":asset?.title||"";$("creatorAssetType").value=asset?.asset_type||creatorMarketingFilter;$("creatorAssetText").value=asset?.placeholder?"":asset?.suggested_text||"";$("creatorAssetProductName").value=asset?.related_product_name||"";$("creatorAssetProductUrl").value=asset?.related_product_url||"";$("creatorAssetCampaign").value="";$("creatorAssetCity").value="";$("creatorAssetTier").value="1";$("creatorAssetStart").value="";$("creatorAssetEnd").value="";$("creatorAssetStatus").value=asset?.status||"active"}
  async function saveAsset(event){event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');button.disabled=true;try{const [media,thumbnail]=await Promise.all([readAssetFile($("creatorAssetMedia")),readAssetFile($("creatorAssetThumbnail"))]),id=$("creatorAssetId").value,body={title:$("creatorAssetTitle").value,assetType:$("creatorAssetType").value,mediaData:media.data,mediaName:media.name,thumbnailData:thumbnail.data,thumbnailName:thumbnail.name,suggestedText:$("creatorAssetText").value,relatedProductName:$("creatorAssetProductName").value,relatedProductUrl:$("creatorAssetProductUrl").value,campaign:"",city:"",minimumTier:1,startAt:null,endAt:null,status:$("creatorAssetStatus").value,displayOrder:Number($("creatorAssetOrder").value||0)};await request("/api/store-owner/creator-marketing-assets"+(id?"/"+encodeURIComponent(id):""),{method:id?"PATCH":"POST",body});resetAssetForm();await loadMarketingAssets()}catch(error){window.alert(error.message)}finally{button.disabled=false}}
  async function reorderMarketingAssets(sourceId,targetId){if(!sourceId||!targetId||sourceId===targetId)return;const rows=creatorMarketingAssets.filter(asset=>asset.asset_type===creatorMarketingFilter).sort((a,b)=>marketingOrder(a)-marketingOrder(b)),from=rows.findIndex(asset=>String(asset.id)===String(sourceId)),to=rows.findIndex(asset=>String(asset.id)===String(targetId));if(from<0||to<0)return;const [moved]=rows.splice(from,1);rows.splice(to,0,moved);await Promise.all(rows.map((asset,index)=>request("/api/store-owner/creator-marketing-assets/"+encodeURIComponent(asset.id),{method:"PATCH",body:marketingAssetBody(asset,{displayOrder:index+1})})));await loadMarketingAssets()}
  function renderCreatorNetwork(rows){
    const apps=(Array.isArray(rows)?rows:[]).map(application=>({application,person:creatorPerson(application)}));
    const incoming=apps.filter(x=>["new","verifying"].includes(x.person.status));
    const selected=apps.filter(x=>x.person.status==="approved");
    const ranked=selected.filter(x=>x.person.visits>0||x.person.orders>0||x.person.sales>0).sort((a,b)=>(b.person.sales-a.person.sales)||(b.person.orders-a.person.orders)||(b.person.visits-a.person.visits)).slice(0,10);
    setText("creatorIncomingCount",number(incoming.length));setText("creatorSelectedCount",number(selected.length));setText("creatorRankedCount",number(ranked.length));const incomingAlert=$("creatorIncomingAlert");if(incomingAlert){incomingAlert.hidden=incoming.length===0;incomingAlert.textContent=incoming.length+" NUEVAS"}
    const incomingIds=new Set(incoming.map(({person})=>person.id));selectedCreatorApplicationIds.forEach(id=>{if(!incomingIds.has(id))selectedCreatorApplicationIds.delete(id)});
    const ib=$("creatorIncomingRows");
    if(ib)ib.innerHTML=incoming.length?incoming.map(({application,person:p})=>'<tr><td class="creatorSelectCell"><input class="creatorSelect" type="checkbox" data-creator-select="'+escapeHtml(p.id)+'" aria-label="Seleccionar '+escapeHtml(p.name)+'" '+(selectedCreatorApplicationIds.has(p.id)?"checked":"")+'></td><td>'+creatorIdentity(p)+'</td><td><div class="creatorApplied">'+escapeHtml(p.submittedDate)+'<span>'+escapeHtml(p.submittedTime)+'</span></div></td><td>'+escapeHtml(p.location)+'</td><td><a class="creatorLink" href="https://wa.me/'+encodeURIComponent(p.phoneDigits)+'" target="_blank" rel="noopener">WhatsApp</a></td><td><div class="creatorLinks">'+creatorProfileLinks(p)+'</div></td><td><div class="creatorSource">'+escapeHtml(application.heard_about||"—")+'</div></td><td><span class="creatorStatus">'+escapeHtml(creatorApplicationStatus(p.status))+"</span></td><td><div class=\"creatorActions\">"+creatorAction(p.id,"verifying","En revisión")+creatorAction(p.id,"approved","Aprobar","primary")+"</div></td></tr>").join(""):'<tr><td class="creatorEmpty" colspan="9">Las nuevas solicitudes aparecerán aquí automáticamente.</td></tr>';
    updateCreatorDeleteControls();
    const sb=$("creatorSelectedRows");
    if(sb)sb.innerHTML=selected.length?selected.map(({person:p})=>{const link=creatorReferralUrl(p.slug);const state=p.onboardingStatus==="active"?"Activa":p.onboardingStatus==="invited"?"Invitación enviada":"Pendiente";return'<article class="creatorApprovedCard is-collapsed"><div class="creatorApprovedTop"><div class="creatorApprovedIdentity">'+creatorIdentity(p,true)+'</div><div class="creatorApprovedTopActions"><span class="creatorStatus">'+escapeHtml(state)+'</span><button class="creatorApprovedToggle" type="button" data-toggle-approved-creator aria-expanded="false" aria-label="Mostrar detalles de la creadora"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div><div class="creatorApprovedDetails"><div class="creatorApprovedLink"><code>'+escapeHtml(link)+'</code><button class="creatorAction" type="button" data-copy-creator-link="'+escapeHtml(link)+'">Copiar enlace</button></div><div class="creatorApprovedMeta"><span><b>Email</b>'+escapeHtml(p.email)+'</span><span><b>Ubicación</b>'+escapeHtml(p.location)+'</span><span><b>Pago</b>'+escapeHtml(p.payoutMethod?p.payoutMethod.toUpperCase()+" · "+p.payoutDestination:"No proporcionado")+'</span><span><b>Acuerdo</b>'+escapeHtml(p.agreementAccepted)+(p.agreementVersion?" · v"+escapeHtml(p.agreementVersion):"")+'</span></div><div class="creatorApprovedBottom"><div class="creatorPerformance"><strong>'+money(p.sales)+'</strong><span>'+number(p.orders)+' pedidos pagados</span><button class="creatorAction primary" type="button" data-creator-sales-id="'+escapeHtml(p.id)+'" data-creator-sales-name="'+escapeHtml(p.name)+'">Ver ventas</button></div><div class="creatorPlan"><div class="creatorPlanLabel"><span>Plan de comisión</span><strong>Nivel '+number(p.tier)+' · '+number(p.commissionRate)+'%</strong></div><div class="creatorTierControls">'+[1,2,3,4,5].map(tier=>'<button class="creatorAction '+(p.tier===tier?'primary':'')+'" type="button" data-creator-id="'+escapeHtml(p.id)+'" data-creator-status="approved" data-creator-tier="'+tier+'">'+(tier*10)+'%</button>').join("")+'</div></div></div><div class="creatorApprovedFooter">'+(p.onboardingStatus==="active"?'<button class="creatorAction" type="button" data-creator-password-reset="'+escapeHtml(p.email)+'">Enviar restablecimiento de contraseña</button>':'')+'<button class="creatorAction primary" type="button" data-creator-mark-paid="'+escapeHtml(p.id)+'">Marcar comisiones pendientes como pagadas</button>'+creatorAction(p.id,"declined","Desactivar creadora","danger")+'</div></div></article>'}).join(""):'<div class="creatorApprovedEmpty">Las creadoras aprobadas aparecerán aquí.</div>';
    if(sb)[...sb.querySelectorAll(".creatorApprovedCard")].forEach((card,index)=>{
      const entry=selected[index],person=entry?.person,application=entry?.application,meta=card.querySelector(".creatorApprovedMeta");
      if(meta){const details=[
        ["Monto pendiente",money(application?.commission_due||0)+(application?.next_payout_at?" · "+creatorSalesDate(application.next_payout_at):"")],
        ["Etapa de la creadora",number(person.tier)>=3?"Creadora destacada":number(person.tier)>=2?"Vendedora":"Creadora"],
        ["Nivel actual de la creadora","Nivel "+number(person.tier)+" · "+number(person.commissionRate)+"%"],
        ["Ventas calificadas de la creadora",money(person.qualifiedSales)],
        ["Próxima meta",person.nextMilestone?money(person.nextMilestone):"Nivel máximo alcanzado"],
        ["Monto restante",money(person.amountRemaining)],
        ["Descuento de creadora",person.creatorDiscount?person.creatorDiscount+"%":"Bloqueado"],
        ["Elegible para campaña de ciudad",person.cityEligible?"Elegible para consideración":"Aún no elegible"],
        ["Elegible para evento de liderazgo",person.leadershipEligible?"Elegible para consideración":"Aún no elegible"],
        ["Oportunidad local",person.cityEligible||person.leadershipEligible?"Elegible para consideración":"Aún no elegible"]
      ];details.forEach(([title,value])=>{const item=document.createElement("span"),label=document.createElement("b");label.textContent=title;item.append(label,document.createTextNode(value));meta.append(item)});const reward=document.createElement("span"),rewardLabel=document.createElement("b"),select=document.createElement("select");rewardLabel.textContent="Estado del paquete de bienvenida";select.dataset.creatorReward=person.id;["locked","earned","preparing","sent"].forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=({locked:"Bloqueado",earned:"Ganado",preparing:"Preparando",sent:"Enviado"}[value]||value);option.selected=value===person.unboxingStatus;select.append(option)});reward.append(rewardLabel,select);meta.append(reward)}
      if(person?.onboardingStatus!=="invited")return;
      const footer=card.querySelector(".creatorApprovedFooter"),button=document.createElement("button");button.className="creatorAction";button.type="button";button.dataset.creatorResendInvite=person.id;button.textContent="Reenviar invitación";footer?.prepend(button)
    });
    const rb=$("creatorRankingRows");if(rb)rb.innerHTML=ranked.length?ranked.map(({person:p},i)=>'<tr><td><span class="creatorRank">'+(i+1)+'</span></td><td><button class="creatorRankingProfile" type="button" data-creator-sales-id="'+escapeHtml(p.id)+'" data-creator-sales-name="'+escapeHtml(p.name)+'" aria-label="Ver detalles de '+escapeHtml(p.name)+'">'+creatorIdentity(p,true)+'</button></td><td>'+number(p.visits)+'</td><td>'+number(p.orders)+'</td><td>'+money(p.sales)+'</td><td>'+percent(p.conversion/100)+'</td></tr>').join(""):'<tr><td class="creatorEmpty" colspan="6">El Top 10 aparecerá cuando las creadoras aprobadas generen actividad atribuida.</td></tr>'
  }

  document.addEventListener("click",async event=>{
    const marketingTab=event.target.closest("[data-marketing-tab]");
    if(marketingTab){fillAssetForm({asset_type:creatorMarketingFilter,display_order:nextMarketingOrder(creatorMarketingFilter)});return}
    const marketingFilter=event.target.closest("[data-marketing-filter]");if(marketingFilter){creatorMarketingFilter=marketingFilter.dataset.marketingFilter||"reel";qsa("[data-marketing-filter]").forEach(button=>button.classList.toggle("active",button===marketingFilter));renderMarketingAssets();return}
    const uploadSlot=event.target.closest("[data-upload-slot]");if(uploadSlot){fillAssetForm({asset_type:uploadSlot.dataset.uploadType||creatorMarketingFilter,display_order:Number(uploadSlot.dataset.uploadSlot||nextMarketingOrder(creatorMarketingFilter))});return}
    const replaceAsset=event.target.closest("[data-replace-asset]");if(replaceAsset){const asset=marketingAssetsForDisplay().find(item=>String(item.id)===replaceAsset.dataset.replaceAsset);fillAssetForm({...asset,display_order:Number(replaceAsset.dataset.slot||marketingOrder(asset))});return}
    const downloadVisible=event.target.closest("[data-download-visible-marketing]");if(downloadVisible){const rows=marketingAssetsForDisplay().filter(asset=>asset.asset_type===creatorMarketingFilter&&asset.media_url).slice(0,9);for(const asset of rows)await downloadMarketingAsset(asset);return}
    const previewAsset=event.target.closest("[data-preview-asset]");if(previewAsset){openMarketingPreview(marketingAssetsForDisplay().find(asset=>asset.id===previewAsset.dataset.previewAsset));return}
    if(event.target.closest("[data-close-marketing-preview]")||event.target===$("marketingPreviewModal")){closeMarketingPreview();return}
    const downloadAsset=event.target.closest("[data-download-asset]");if(downloadAsset){await downloadMarketingAsset(marketingAssetsForDisplay().find(asset=>asset.id===downloadAsset.dataset.downloadAsset));return}
    const copyMarketingText=event.target.closest("[data-copy-marketing-text]");if(copyMarketingText){await navigator.clipboard.writeText(decodeURIComponent(copyMarketingText.dataset.copyMarketingText||""));copyMarketingText.textContent="Copied";return}
    if(event.target.closest("[data-cancel-asset]")){resetAssetForm();return}
    const editAsset=event.target.closest("[data-edit-asset]");if(editAsset){fillAssetForm(creatorMarketingAssets.find(asset=>asset.id===editAsset.dataset.editAsset)||{});return}
    const toggleAsset=event.target.closest("[data-toggle-asset]");if(toggleAsset){const asset=creatorMarketingAssets.find(item=>item.id===toggleAsset.dataset.toggleAsset);if(!asset)return;toggleAsset.disabled=true;try{await request("/api/store-owner/creator-marketing-assets/"+encodeURIComponent(asset.id),{method:"PATCH",body:marketingAssetBody(asset,{status:toggleAsset.dataset.assetStatus})});await loadMarketingAssets()}catch(error){window.alert(error.message)}return}
    const deleteAsset=event.target.closest("[data-delete-asset]");if(deleteAsset){if(!window.confirm("Delete this marketing asset?"))return;await request("/api/store-owner/creator-marketing-assets/"+encodeURIComponent(deleteAsset.dataset.deleteAsset),{method:"DELETE"});await loadMarketingAssets();return}
    const creatorToggle=event.target.closest("[data-toggle-approved-creator]");
    if(creatorToggle){const card=creatorToggle.closest(".creatorApprovedCard");const collapsed=card?.classList.toggle("is-collapsed");creatorToggle.setAttribute("aria-expanded",String(!collapsed));creatorToggle.setAttribute("aria-label",collapsed?"Mostrar detalles de la creadora":"Ocultar detalles de la creadora");return}
    const sectionToggle=event.target.closest("[data-toggle-creator-section]");
    if(sectionToggle){const section=sectionToggle.closest(".creatorSection");const collapsed=section?.classList.toggle("is-collapsed");const label=sectionToggle.dataset.sectionLabel||"sección";sectionToggle.setAttribute("aria-expanded",String(!collapsed));sectionToggle.setAttribute("aria-label",(collapsed?"Mostrar ":"Ocultar ")+label);return}
    const salesModal=$("creatorSalesModal");
    if(event.target.closest("[data-close-creator-sales]")||event.target===salesModal){closeCreatorSales();return}
    const periodButton=event.target.closest("[data-creator-sales-period]");
    if(periodButton&&activeCreatorSales){await openCreatorSales(activeCreatorSales.id,activeCreatorSales.name,periodButton.dataset.creatorSalesPeriod||"30d");return}
    const salesButton=event.target.closest("[data-creator-sales-id]");
    if(salesButton){await openCreatorSales(salesButton.dataset.creatorSalesId,salesButton.dataset.creatorSalesName);return}
    const copyButton=event.target.closest("[data-copy-creator-link]");
    if(copyButton){await navigator.clipboard.writeText(copyButton.dataset.copyCreatorLink||"");copyButton.textContent="Copiado";setTimeout(()=>copyButton.textContent="Copiar",1200);return}
    const deleteButton=event.target.closest("[data-delete-selected-creators]");
    if(deleteButton){const ids=[...selectedCreatorApplicationIds];if(!ids.length)return;deleteButton.disabled=true;try{await Promise.all(ids.map(id=>request("/api/store-owner/creator-applications/"+encodeURIComponent(id),{method:"DELETE"})));selectedCreatorApplicationIds.clear();await load(true)}catch(error){window.alert(error?.message||"No se pudieron eliminar las solicitudes seleccionadas.");updateCreatorDeleteControls()}return}
    const markPaidButton=event.target.closest("[data-creator-mark-paid]");
    if(markPaidButton){if(!window.confirm("¿Confirmas que ya enviaste el pago pendiente de esta creadora?"))return;markPaidButton.disabled=true;try{const result=await request("/api/store-owner/creator-applications/"+encodeURIComponent(markPaidButton.dataset.creatorMarkPaid)+"/payouts/mark-paid",{method:"POST"});window.alert(result.paidCount?money(result.paidAmount)+" registrado como pagado.":"No había comisiones pendientes de pago.");await load(true)}catch(error){window.alert(error?.message||"No se pudo registrar el pago.")}finally{markPaidButton.disabled=false}return}
    const resendInviteButton=event.target.closest("[data-creator-resend-invite]");
    if(resendInviteButton){resendInviteButton.disabled=true;try{await request("/api/store-owner/creator-applications/"+encodeURIComponent(resendInviteButton.dataset.creatorResendInvite)+"/invitation",{method:"POST"});window.alert("Invitación enviada.")}catch(error){window.alert(error?.message||"No se pudo reenviar la invitación.")}finally{resendInviteButton.disabled=false}return}
    const passwordResetButton=event.target.closest("[data-creator-password-reset]");
    if(passwordResetButton){if(!window.confirm("¿Enviar un nuevo enlace para restablecer la contraseña a esta creadora?"))return;const label=passwordResetButton.textContent;passwordResetButton.disabled=true;passwordResetButton.textContent="Enviando…";try{await request("/api/creators/password-reset/request",{method:"POST",body:{email:passwordResetButton.dataset.creatorPasswordReset}});passwordResetButton.textContent="Restablecimiento enviado";setTimeout(()=>{passwordResetButton.textContent=label;passwordResetButton.disabled=false},1800)}catch(error){passwordResetButton.textContent=label;passwordResetButton.disabled=false;window.alert(error?.message||"No se pudo enviar el correo de restablecimiento de contraseña.")}return}
    const button=event.target.closest("[data-creator-status]");
    if(!button)return;
    const id=button.dataset.creatorId;
    const status=button.dataset.creatorStatus;
    const tier=Number(button.dataset.creatorTier||1);
    button.disabled=true;
    try{await request("/api/store-owner/creator-applications/"+encodeURIComponent(id),{method:"PATCH",body:{status,tier}});await load(true)}
    catch(error){window.alert(error?.message||"No se pudo actualizar la creadora.")}
    finally{button.disabled=false}
  });

  document.addEventListener("change",event=>{
    const reward=event.target.closest("[data-creator-reward]");if(reward){request("/api/store-owner/creator-applications/"+encodeURIComponent(reward.dataset.creatorReward)+"/rewards",{method:"PATCH",body:{unboxingStatus:reward.value}}).then(()=>load(true)).catch(error=>window.alert(error.message));return}
    if(event.target.id==="creatorSelectAll"){qsa("[data-creator-select]").forEach(box=>{box.checked=event.target.checked;if(box.checked)selectedCreatorApplicationIds.add(box.dataset.creatorSelect);else selectedCreatorApplicationIds.delete(box.dataset.creatorSelect)});updateCreatorDeleteControls();return}
    const box=event.target.closest("[data-creator-select]");if(!box)return;if(box.checked)selectedCreatorApplicationIds.add(box.dataset.creatorSelect);else selectedCreatorApplicationIds.delete(box.dataset.creatorSelect);updateCreatorDeleteControls()
  });

  $("creatorAssetForm")?.addEventListener("submit",saveAsset);
  $("creatorMarketingSearch")?.addEventListener("input",event=>{creatorMarketingSearch=event.target.value;renderMarketingAssets()});
  $("creatorMarketingAssets")?.addEventListener("dragstart",event=>{const card=event.target.closest("[data-asset-id]");if(!card)return;card.classList.add("is-dragging");event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",card.dataset.assetId)});
  $("creatorMarketingAssets")?.addEventListener("dragover",event=>{const card=event.target.closest("[data-asset-id]");if(!card)return;event.preventDefault();qsa(".creatorMarketingCard.is-drop-target").forEach(item=>item.classList.remove("is-drop-target"));card.classList.add("is-drop-target")});
  $("creatorMarketingAssets")?.addEventListener("drop",async event=>{const card=event.target.closest("[data-asset-id]");if(!card)return;event.preventDefault();const sourceId=event.dataTransfer.getData("text/plain");qsa(".creatorMarketingCard.is-drop-target").forEach(item=>item.classList.remove("is-drop-target"));try{await reorderMarketingAssets(sourceId,card.dataset.assetId)}catch(error){window.alert(error.message)}});
  $("creatorMarketingAssets")?.addEventListener("dragend",()=>qsa(".creatorMarketingCard.is-dragging,.creatorMarketingCard.is-drop-target").forEach(item=>item.classList.remove("is-dragging","is-drop-target")));

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
    if(!creatorMarketingLoaded)loadMarketingAssets();
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
