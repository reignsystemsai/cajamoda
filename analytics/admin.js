(function(){
  "use strict";
  const core=document.createElement("script");
  core.src="/analytics/admin-core.js";
  core.onload=installCreatorLifecycleControls;
  document.head.appendChild(core);

  function installCreatorLifecycleControls(){
    const TOKEN_KEY="cajamoda-store-loader-token";
    const API="https://cajamoda-storeload-api.onrender.com";
    function patch(){
      document.querySelectorAll(".creatorApprovedCard").forEach(card=>{
        const button=card.querySelector('[data-creator-status="declined"]');
        if(!button)return;
        const statusText=String(card.querySelector(".creatorStatus")?.textContent||"").trim().toLowerCase();
        const inactive=statusText==="pending"||statusText==="deactivated"||statusText==="inactive";
        button.removeAttribute("data-creator-status");
        button.dataset.creatorLifecycle=inactive?"active":"inactive";
        button.textContent=inactive?"Reactivate creator":"Deactivate creator";
        button.classList.toggle("danger",!inactive);
      });
    }
    const observer=new MutationObserver(patch);
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    patch();
    document.addEventListener("click",async event=>{
      const button=event.target.closest("[data-creator-lifecycle]");
      if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      const status=button.dataset.creatorLifecycle,id=button.dataset.creatorId;
      const verb=status==="active"?"reactivate":"deactivate";
      if(!window.confirm((status==="active"?"Reactivate":"Deactivate")+" this creator?"))return;
      button.disabled=true;
      try{
        const response=await fetch(`${API}/api/store-owner/creator-applications/${encodeURIComponent(id)}/lifecycle`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionStorage.getItem(TOKEN_KEY)||""}`},body:JSON.stringify({status})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(data.error||`Could not ${verb} creator.`);
        window.CajaModaAdminAnalytics?.load?.(true);
      }catch(error){window.alert(error.message)}finally{button.disabled=false}
    },true);
  }
})();
