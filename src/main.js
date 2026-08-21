<!doctype html>
<html lang="es">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<meta
  name="theme-color"
  content="#ffffff"
>

<meta
  name="color-scheme"
  content="light"
>

<title>Producto | CajaModa Colombia</title>

<link
  rel="preconnect"
  href="https://fonts.googleapis.com"
>

<link
  rel="preconnect"
  href="https://fonts.gstatic.com"
  crossorigin
>

<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
  rel="stylesheet"
>

<style>

/* ============================================================
   CAJAMODA PRODUCT PAGE
   FULL SCREEN PRODUCT EXPERIENCE
   ============================================================ */

:root{

  --bg:#ffffff;

  --ink:#080808;

  --soft:#555555;

  --muted:#8b8b8b;

  --line:
    rgba(0,0,0,.10);

  --line-strong:
    rgba(0,0,0,.18);

  --glass:
    rgba(255,255,255,.48);

  --glass-strong:
    rgba(255,255,255,.72);

  --nav-h:
    52px;

  --mobile-max:
    430px;

  --safe-top:
    env(
      safe-area-inset-top,
      0px
    );

  --safe-bottom:
    env(
      safe-area-inset-bottom,
      0px
    );
}

/* ============================================================
   RESET
   ============================================================ */

*{
  box-sizing:border-box;
}

html{

  width:100%;

  min-height:100%;

  margin:0;

  background:#fff;

  -webkit-text-size-adjust:100%;
}

body{

  width:100%;

  min-height:100%;

  margin:0;

  overflow-x:hidden;

  background:#fff;

  color:var(--ink);

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  -webkit-font-smoothing:
    antialiased;
}

body.locked{
  overflow:hidden;
}

button,
input,
textarea{

  font:inherit;

  color:inherit;
}

button{

  border:0;

  padding:0;

  margin:0;

  background:none;

  cursor:pointer;

  -webkit-tap-highlight-color:
    transparent;
}

img{

  display:block;

  max-width:100%;

  user-select:none;

  -webkit-user-drag:none;
}

svg{

  display:block;

  pointer-events:none;
}

.hidden{
  display:none!important;
}

/* ============================================================
   APP
   ============================================================ */

.productApp{

  position:relative;

  width:100%;

  min-height:100dvh;

  margin:0 auto;

  overflow:hidden;

  background:#fff;
}

@media(min-width:700px){

  body{
    background:#f3f3f3;
  }

  .productApp{

    width:
      min(
        100%,
        var(--mobile-max)
      );

    box-shadow:
      0 0 65px
      rgba(0,0,0,.08);
  }
}

/* ============================================================
   FULL SCREEN PHOTO
   ============================================================ */

.photoStage{

  position:relative;

  width:100%;

  height:100dvh;

  min-height:650px;

  overflow:hidden;

  background:#fff;

  /*
    Vertical page movement remains natural.
    Horizontal motion is available for product swiping.
  */

  touch-action:pan-y;
}

.mainPhoto{

  position:absolute;

  inset:0;

  width:100%;

  height:100%;

  object-fit:cover;

  object-position:center center;

  background:#fff;

  transition:
    opacity .17s ease,
    transform .22s ease;
}

.mainPhoto.changing{

  opacity:.76;

  transform:
    scale(.985);
}

/* ============================================================
   PRODUCT CATEGORY NAVIGATION
   OVER PHOTO — NO SEPARATE WHITE HEADER
   ============================================================ */
/* ============================================================
   MINIMAL PRODUCT CATEGORY HEADER
   ============================================================ */

.productCategoryNav{

  position:absolute;

  z-index:30;

  top:0;

  left:0;

  right:0;

  height:
    calc(
      54px +
      var(--safe-top)
    );

  padding:
    var(--safe-top)
    16px
    0;

  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:18px;

  overflow-x:auto;

  overflow-y:hidden;

  background:
    rgba(255,255,255,.96);

  border:0;

  border-radius:0;

  box-shadow:none;

  backdrop-filter:none;

  -webkit-backdrop-filter:none;

  scrollbar-width:none;

  -webkit-overflow-scrolling:
    touch;
}

.productCategoryNav::-webkit-scrollbar{
  display:none;
}

.productCategoryButton{

  position:relative;

  flex:0 0 auto;

  height:100%;

  padding:0 2px;

  display:flex;

  align-items:center;

  justify-content:center;

  white-space:nowrap;

  color:rgba(0,0,0,.48);

  font-size:7px;

  font-weight:500;

  letter-spacing:.08px;

  text-transform:uppercase;

  transition:
    color .18s ease,
    transform .18s ease;
}

.productCategoryButton.active{

  color:#080808;

  font-weight:700;
}

.productCategoryButton.active::after{

  content:"";

  position:absolute;

  left:0;

  right:0;

  bottom:5px;

  height:2px;

  border-radius:999px;

  background:#080808;
}

.productCategoryButton:active{
  transform:scale(.95);
}

@media(hover:hover){

  .productCategoryButton:hover{
    color:#080808;
  }
}

/* ============================================================
   4 ADDITIONAL PRODUCT PHOTOS
   ============================================================ */

.thumbnailRail{

  position:absolute;

  z-index:15;

  top:
    calc(
      67px +
      var(--safe-top)
    );

  right:13px;

  width:47px;

  display:flex;

  flex-direction:column;

  gap:7px;
}

.thumbnail{

  position:relative;

  width:47px;

  height:59px;

  padding:2px;

  border-radius:9px;

  overflow:hidden;

  background:
    rgba(255,255,255,.74);

  border:
    1px solid
    rgba(0,0,0,.10);

  box-shadow:
    0 6px 17px
    rgba(0,0,0,.08);

  backdrop-filter:
    blur(13px);

  -webkit-backdrop-filter:
    blur(13px);

  transition:
    transform .16s ease,
    border-color .16s ease;
}

.thumbnail img{

  width:100%;

  height:100%;

  object-fit:cover;

  border-radius:7px;
}

.thumbnail.active{

  border-color:#111;

  box-shadow:
    0 0 0 1px
    rgba(0,0,0,.26),
    0 6px 17px
    rgba(0,0,0,.08);
}

.thumbnailPlaceholder{

  width:100%;

  height:100%;

  display:grid;

  place-items:center;

  border-radius:7px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.94),
      rgba(240,240,240,.86)
    );

  color:#999;

  font-size:6px;
}

.thumbnail:active{

  transform:
    scale(.94);
}

@media(hover:hover){

  .thumbnail:hover{

    transform:
      translateX(-3px)
      scale(1.025);
  }
}

/* ============================================================
   RIGHT CONTROL STACK
   NUMBER > HEART > SHARE > BAG
   ============================================================ */

.rightControls{

  position:absolute;

  z-index:20;

  right:14px;

  top:
    calc(
      352px +
      var(--safe-top)
    );

  display:flex;

  flex-direction:column;

  align-items:center;

  gap:9px;
}

/* ============================================================
   GENERAL ROUND GLASS BUTTON
   ============================================================ */

.circleControl{

  position:relative;

  width:42px;

  height:42px;

  border-radius:50%;

  display:grid;

  place-items:center;

  background:
    rgba(255,255,255,.72);

  border:
    1px solid
    rgba(255,255,255,.96);

  box-shadow:

    0 0 0 1px
    rgba(0,0,0,.025),

    0 8px 22px
    rgba(0,0,0,.085);

  backdrop-filter:
    blur(20px)
    saturate(155%);

  -webkit-backdrop-filter:
    blur(20px)
    saturate(155%);

  transition:
    transform .16s ease,
    box-shadow .16s ease;
}

.circleControl svg{

  width:20px;

  height:20px;

  stroke-width:1.5;
}

.circleControl:active{

  transform:
    scale(.90);
}

@media(hover:hover){

  .circleControl:hover{

    transform:
      translateY(-2px)
      scale(1.035);

    box-shadow:
      0 13px 28px
      rgba(0,0,0,.12);
  }
}

/* ============================================================
   PRODUCT NUMBER
   ============================================================ */

.productNumber{

  width:38px;

  height:38px;

  border-radius:50%;

  display:grid;

  place-items:center;

  background:
    rgba(255,255,255,.73);

  border:
    1px solid
    rgba(255,255,255,.96);

  box-shadow:

    0 0 0 1px
    rgba(0,0,0,.025),

    0 7px 18px
    rgba(0,0,0,.075);

  backdrop-filter:
    blur(18px);

  -webkit-backdrop-filter:
    blur(18px);

  font-size:11px;

  font-weight:700;
}

/* ============================================================
   FAVORITE
   ============================================================ */

.favoriteButton{
  color:#111;
}

.favoriteButton.active{

  color:#e61937;

  background:
    rgba(255,235,239,.85);

  box-shadow:

    0 0 0 1px
    rgba(230,25,55,.08),

    0 9px 24px
    rgba(230,25,55,.16);

  animation:favoriteHeartbeat 1.8s ease-in-out infinite;
}

.favoriteButton.active svg{

  fill:currentColor;

  stroke:currentColor;
}

@keyframes favoriteHeartbeat{
  0%,72%,100%{transform:scale(1)}
  8%{transform:scale(1.14)}
  16%{transform:scale(1)}
  24%{transform:scale(1.09)}
  32%{transform:scale(1)}
}

@media(prefers-reduced-motion:reduce){
  .favoriteButton.active{animation:none}
}

/* ============================================================
   WISHLIST OVERLAY
   ============================================================ */

.wishListOverlay{
  position:fixed;
  inset:0;
  z-index:195;
  display:none;
  background:rgba(0,0,0,.08);
  backdrop-filter:blur(5px);
  -webkit-backdrop-filter:blur(5px);
}

.wishListOverlay.open{
  display:block;
}

.wishListPanel{
  position:absolute;
  left:9px;
  right:9px;
  bottom:calc(var(--nav-h) + 16px + var(--safe-bottom));
  max-height:min(420px,62vh);
  padding:13px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.92);
  border-radius:22px;
  background:rgba(255,255,255,.72);
  box-shadow:0 16px 45px rgba(0,0,0,.14);
  backdrop-filter:blur(24px) saturate(145%);
  -webkit-backdrop-filter:blur(24px) saturate(145%);
  animation:wishListEnter .24s ease both;
}

@keyframes wishListEnter{
  from{
    opacity:0;
    transform:translateY(14px);
  }
  to{
    opacity:1;
    transform:translateY(0);
  }
}

.wishListHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}

.wishListEyebrow{
  font-size:7px;
  font-weight:800;
  letter-spacing:.15em;
  color:#777;
}

.wishListTitle{
  margin-top:2px;
  font-size:14px;
  font-weight:800;
}

.wishListClose{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  flex:0 0 auto;
  border:1px solid rgba(255,255,255,.94);
  border-radius:999px;
  background:rgba(255,255,255,.68);
  color:#111;
  box-shadow:0 8px 20px rgba(0,0,0,.08);
}

.wishListClose svg{
  width:17px;
  height:17px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.35;
}

.wishListRail{
  display:flex;
  gap:8px;
  margin-top:10px;
  padding-bottom:2px;
  overflow-x:auto;
  overscroll-behavior:contain;
  scroll-snap-type:x mandatory;
  scrollbar-width:none;
  -webkit-overflow-scrolling:touch;
}

.wishListRail::-webkit-scrollbar{
  display:none;
}

.wishListCard{
  flex:0 0 93px;
  min-width:0;
  padding:0;
  text-align:left;
  scroll-snap-align:start;
  background:transparent;
  color:#111;
}

.wishListImage,
.wishListPlaceholder{
  width:93px;
  height:116px;
  overflow:hidden;
  border-radius:11px;
  background:rgba(238,238,238,.76);
}

.wishListImage img{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
}

.wishListPlaceholder{
  display:grid;
  place-items:center;
  font-size:8px;
  color:#777;
}

.wishListName{
  margin-top:6px;
  overflow:hidden;
  font-size:7.8px;
  font-weight:700;
  line-height:1.25;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.wishListPrice{
  margin-top:2px;
  font-size:7.4px;
  font-weight:800;
}

.wishListEmpty{
  width:100%;
  padding:24px 12px 18px;
  text-align:center;
  font-size:9px;
  color:#666;
}

.wishListEmptyHeart{
  width:29px;
  height:29px;
  margin:0 auto 8px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.25;
}

/* ============================================================
   SHARE
   ============================================================ */

.shareButton svg{

  width:21px;

  height:21px;

  stroke-width:1.45;
}

/* ============================================================
   BAG NOW UNDER SHARE
   ============================================================ */

.photoBag{

  position:relative;
}

.photoBag svg{

  width:20px;

  height:20px;

  stroke-width:1.5;
}

.bagBadge{

  position:absolute;

  top:-4px;

  right:-4px;

  min-width:18px;

  height:18px;

  padding:
    0 4px;

  border-radius:999px;

  background:#080808;

  color:#fff;

  border:
    2px solid #fff;

  display:grid;

  place-items:center;

  font-size:7px;

  font-weight:800;
}

.bagBadge.bump{

  animation:
    bagBump .24s ease;
}

@keyframes bagBump{

  50%{

    transform:
      scale(1.30);
  }
}

/* ============================================================
   CLOSED PRICE CAPSULE
   ============================================================ */

.priceCapsule{

  position:absolute;

  z-index:22;

  left:19px;

  bottom:
    calc(
      var(--nav-h) +
      40px +
      var(--safe-bottom)
    );

  min-width:172px;

  height:49px;

  padding:
    0 15px
    0 17px;

  border-radius:999px;

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  gap:14px;

  background:
    rgba(255,255,255,.55);

  border:
    1px solid
    rgba(255,255,255,.95);

  box-shadow:

    0 0 0 1px
    rgba(0,0,0,.035),

    0 9px 28px
    rgba(0,0,0,.095);

  backdrop-filter:
    blur(22px)
    saturate(155%);

  -webkit-backdrop-filter:
    blur(22px)
    saturate(155%);

  transition:
    transform .17s ease,
    background .17s ease;
}

.priceCapsuleText{

  font-size:13px;

  font-weight:500;

  white-space:nowrap;
}

.priceCapsule svg{

  width:17px;

  height:17px;

  stroke-width:1.9;
}

.priceCapsule:active{

  transform:
    scale(.97);
}

@media(hover:hover){
### Block 2 of 6

```html
  .priceCapsule:hover{

    transform:
      translateY(-2px);

    background:
      rgba(255,255,255,.70);
  }
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */

.bottomNav{

  position:fixed;

  z-index:90;

  left:50%;

  bottom:
    max(
      7px,
      var(--safe-bottom)
    );

  transform:
    translateX(-50%);

  width:
    min(
      calc(100% - 25px),
      402px
    );

  height:
    var(--nav-h);

  padding:
    2px 5px;

  border-radius:18px;

  display:grid;

  grid-template-columns:
    repeat(
      5,
      1fr
    );

  align-items:center;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.67),
      rgba(255,255,255,.28)
    );

  border:
    1px solid
    rgba(255,255,255,.95);

  box-shadow:

    0 0 0 1px
    rgba(0,0,0,.028),

    inset 0 1px 0
    rgba(255,255,255,.98),

    0 8px 25px
    rgba(0,0,0,.075);

  backdrop-filter:
    blur(29px)
    saturate(170%);

  -webkit-backdrop-filter:
    blur(29px)
    saturate(170%);
}

.navButton{

  position:relative;

  height:43px;

  border-radius:14px;

  display:flex;

  flex-direction:column;

  align-items:center;

  justify-content:center;

  gap:1px;

  transition:
    transform .17s ease,
    background .17s ease;
}

.navButton svg{

  width:18px;

  height:18px;

  stroke-width:1.4;
}

.navButton span{

  font-size:6.7px;
}

.navButton.active{

  background:transparent;

  box-shadow:none;
}

@media(hover:hover){

  .navButton:hover{

    transform:
      translateY(-2px);

    background:
      rgba(255,255,255,.65);
  }
}

.navButton:active{

  transform:
    scale(.94);

  background:
    rgba(255,255,255,.72);
}

.navPlusOrb{

  width:29px;

  height:29px;

  border-radius:50%;

  display:grid;

  place-items:center;

  background:#111;

  color:#fff;

  box-shadow:
    0 6px 16px
    rgba(0,0,0,.15);
}

.navPlusOrb svg{

  width:15px;

  height:15px;
}

.navBagBadge{

  position:absolute;

  top:0;

  right:
    calc(
      50% - 18px
    );

  min-width:15px;

  height:15px;

  padding:
    0 3px;

  border-radius:999px;

  background:#090909;

  color:#fff;

  border:
    1.5px solid #fff;

  display:grid;

  place-items:center;

  font-size:
    6.3px!important;

  font-weight:800;
}

/* ============================================================
   DETAILS OVERLAY
   ============================================================ */

.detailsOverlay{

  position:fixed;

  inset:0;

  z-index:120;

  display:none;

  pointer-events:none;
}

.detailsOverlay.open{

  display:block;

  pointer-events:auto;
}

.detailsBackdrop{

  position:absolute;

  inset:0;

  background:
    rgba(255,255,255,.01);
}

/* ============================================================
   CLEAR GLASS DETAILS
   ============================================================ */

.detailsSheet{

  position:absolute;

  left:17px;

  right:17px;

  bottom:
    calc(
      var(--nav-h) +
      18px +
      var(--safe-bottom)
    );

  max-height:
    min(
      64dvh,
      555px
    );

  border-radius:24px;

  overflow:hidden;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.70),
      rgba(255,255,255,.40)
    );

  border:
    1px solid
    rgba(255,255,255,.95);

  box-shadow:

    0 0 0 1px
    rgba(0,0,0,.04),

    0 22px 60px
    rgba(0,0,0,.15);

  backdrop-filter:
    blur(34px)
    saturate(155%);

  -webkit-backdrop-filter:
    blur(34px)
    saturate(155%);

  transform:
    translateY(24px);

  opacity:0;

  transition:
    transform .24s ease,
    opacity .24s ease;
}

.detailsOverlay.open
.detailsSheet{

  transform:none;

  opacity:1;
}

.detailsScroll{

  max-height:
    min(
      64dvh,
      555px
    );

  overflow-y:auto;

  padding:
    11px 14px
    15px;

  -webkit-overflow-scrolling:
    touch;
}

/* ============================================================
   DRAG HANDLE
   ============================================================ */

.dragHandle{

  display:block;

  width:32px;

  height:3px;

  margin:
    0 auto 10px;

  border-radius:999px;

  background:
    rgba(0,0,0,.20);
}

/* ============================================================
   DETAILS TOP
   TITLE / PRICE / BAG
   ============================================================ */

.detailsTop{

  display:grid;

  grid-template-columns:
    1fr auto;

  gap:12px;

  align-items:start;
}

.detailsTitle{

  font-size:15px;

  line-height:1.2;

  font-weight:600;
}

.detailsPrice{

  margin-top:4px;

  font-size:19px;

  line-height:1;

  font-weight:800;
}

.detailsPrice small{

  font-size:8px;

  font-weight:600;
}

.detailsBag{

  position:relative;

  width:39px;

  height:39px;

  border-radius:50%;

  display:grid;

  place-items:center;

  background:
    rgba(255,255,255,.55);

  border:
    1px solid
    rgba(0,0,0,.07);

  box-shadow:
    0 5px 15px
    rgba(0,0,0,.055);
}

.detailsBag svg{

  width:19px;

  height:19px;

  stroke-width:1.5;
}

.detailsBagCount{

  position:absolute;

  top:-3px;

  right:-3px;

  min-width:16px;

  height:16px;

  padding:
    0 3px;

  border-radius:999px;

  display:grid;

  place-items:center;

  background:#111;

  color:#fff;

  border:
    1.5px solid #fff;

  font-size:6px;

  font-weight:800;
}

/* ============================================================
   DESCRIPTION
   ============================================================ */

.descriptionBlock{

  margin-top:15px;

  padding-top:12px;

  border-top:
    1px solid
    rgba(0,0,0,.07);
}

.sectionTitle{

  font-size:8.5px;

  font-weight:800;
}

.descriptionText{

  margin-top:6px;

  font-size:8px;

  line-height:1.55;

  color:#444;
}

/* ============================================================
   OPTIONS
   ============================================================ */

.optionSection{

  margin-top:15px;
}

.optionLabel{

  font-size:8.5px;

  font-weight:700;
}

.optionLabelValue{

  font-weight:800;
}

/* ============================================================
   COLORS
   ============================================================ */

.colorRow{

  display:flex;

  align-items:center;

  gap:10px;

  margin-top:8px;
}

.colorButton{

  width:29px;

  height:29px;

  border-radius:50%;

  border:
    3px solid
    rgba(255,255,255,.88);

  box-shadow:
    0 0 0 1px
    rgba(0,0,0,.10);

  transition:
    transform .15s ease,
    box-shadow .15s ease;
}

.colorButton.active{

  box-shadow:

    0 0 0 2px
    #111,

    0 0 0 4px
    rgba(255,255,255,.94);
}

.colorButton:active{

  transform:
    scale(.91);
}

.colorBlack{
  background:#090909;
}

.colorRed{
  background:#e92336;
}

.colorCream{
  background:#f2dfc7;
}

/* ============================================================
   SIZES
   ============================================================ */

.sizeGrid{

  display:grid;

  grid-template-columns:
    repeat(
      5,
      1fr
    );

  gap:7px;

  margin-top:8px;
}

.sizeButton{

  position:relative;

  height:39px;

  border-radius:10px;

  border:
    1px solid
    rgba(0,0,0,.10);

  background:
    rgba(255,255,255,.43);

  font-size:8.5px;

  font-weight:600;

  transition:
    background .15s ease,
    border-color .15s ease,
    transform .15s ease;
}

.sizeButton.selected{

  border-color:#080808;

  background:
    rgba(255,255,255,.82);

  box-shadow:
    inset 0 0 0 1px
    rgba(0,0,0,.28);
}

.sizeButton:active{

  transform:
    scale(.94);
}

.selectedSizeQuantities{
  display:grid;
  gap:7px;
  margin-top:10px;
}

.selectedSizeQuantity{

  min-height:40px;

  padding:
    6px 8px
    6px 11px;

  border:
    1px solid
    rgba(0,0,0,.10);

  border-radius:12px;

  background:
    rgba(255,255,255,.48);

  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:10px;
}

.selectedSizeName{

  font-size:8px;

  font-weight:700;
}

.selectedSizeControls{

  display:flex;

  align-items:center;

  gap:5px;
}

.selectedSizeControls button{

  width:28px;

  height:28px;

  border:
    1px solid
    rgba(0,0,0,.10);

  border-radius:50%;

  background:
    rgba(255,255,255,.72);

  font-size:13px;
}

.selectedSizeControls span{

  min-width:18px;

  text-align:center;

  font-size:9px;

  font-weight:700;
}

/* ============================================================
   PURCHASE
   ============================================================ */

.purchaseActions{

  margin-top:17px;
}

.addBagButton,
.buyNowButton{

  width:100%;

  height:43px;

  border-radius:11px;

  font-size:9px;

  font-weight:750;
}

.addBagButton{

  background:#080808;

  color:#fff;
}

.buyNowButton{

  margin-top:6px;

  background:#080808;

  color:#fff;

  border:
    1px solid #080808;
}

.purchaseMeta{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  gap:10px;

  margin-top:9px;

  font-size:5.9px;

  color:#555;
}

/* ============================================================
   SHARE OVERLAY
   ============================================================ */

.shareOverlay{

  position:fixed;

  inset:0;

  z-index:190;

  display:none;

  background:
    rgba(0,0,0,.08);

  backdrop-filter:
    blur(5px);

  -webkit-backdrop-filter:
    blur(5px);
}

.shareOverlay.open{
  display:block;
}

.sharePanel{

  position:absolute;

  left:12px;

  right:12px;

  bottom:
    calc(
      var(--nav-h) +
      18px +
      var(--safe-bottom)
    );

  border-radius:20px;

  padding:13px;

  background:
    rgba(255,255,255,.78);

  border:
    1px solid
    rgba(255,255,255,.96);

  box-shadow:
    0 18px 50px
    rgba(0,0,0,.13);

  backdrop-filter:
    blur(28px)
    saturate(160%);

  -webkit-backdrop-filter:
    blur(28px)
    saturate(160%);
}

.shareHead{

  display:flex;

  justify-content:
    space-between;

  align-items:center;
}

.shareTitle{

  font-size:11px;

  font-weight:800;
}

.shareClose{

  width:29px;

  height:29px;

  border-radius:50%;

  display:grid;

  place-items:center;

  border:
    1px solid
    rgba(0,0,0,.07);

  background:
    rgba(255,255,255,.55);
}

.shareClose svg{

  width:14px;

  height:14px;
}

.shareOptions{

  display:grid;

  grid-template-columns:
    repeat(
      3,
      1fr
    );

  gap:8px;

  margin-top:12px;
}

.socialShare{

  min-height:73px;

  border-radius:14px;

  border:
    1px solid
    rgba(0,0,0,.07);

  background:
    rgba(255,255,255,.44);

  display:flex;

  flex-direction:column;

  align-items:center;

  justify-content:center;

  gap:7px;

  transition:
    transform .17s ease,
    background .17s ease;
}

.socialShare:active{

  transform:
    scale(.95);
}

.socialIcon{

  width:31px;

  height:31px;

  border-radius:50%;

  display:grid;

  place-items:center;

  background:#111;

  color:#fff;

  font-size:8px;

  font-weight:800;
}

.socialLabel{

  font-size:7.2px;

  font-weight:700;
}

/* ============================================================
   PLUS MENU
   ============================================================ */

.plusOverlay{

  position:fixed;

  inset:0;

  z-index:180;

  display:none;

  background:
    rgba(0,0,0,.08);

  backdrop-filter:
    blur(5px);

  -webkit-backdrop-filter:
    blur(5px);
}

.plusOverlay.open{
  display:block;
}

.plusPanel{

  position:absolute;

  left:12px;

  right:12px;

  bottom:
    calc(
      var(--nav-h) +
      18px +
      var(--safe-bottom)
    );

  border-radius:20px;

  padding:12px;

  background:
    rgba(255,255,255,.79);

  border:
    1px solid
    rgba(255,255,255,.96);

  box-shadow:
    0 18px 50px
    rgba(0,0,0,.13);

  backdrop-filter:
    blur(28px);

  -webkit-backdrop-filter:
    blur(28px);
}

.plusHead{

  display:flex;

  justify-content:
    space-between;

  align-items:center;
}

.plusTitle{

  font-size:11px;

  font-weight:800;
}

.plusClose{

  width:29px;

  height:29px;

  border-radius:50%;

  display:grid;

  place-items:center;

  border:
    1px solid
    rgba(0,0,0,.07);

  font-size:15px;
}

.plusList{

  margin-top:8px;
}

.plusItem{

  width:100%;

  min-height:43px;

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  border-top:
    1px solid
    rgba(0,0,0,.06);

  font-size:8px;

  font-weight:650;
}

/* ============================================================
   TOAST
   ============================================================ */

.toast{

  position:fixed;

  z-index:260;

  left:50%;

  bottom:
    calc(
      var(--nav-h) +
      24px +
      var(--safe-bottom)
    );

  transform:
    translateX(-50%)
    translateY(8px);
```
  max-width:
    calc(
      100vw -
      30px
    );

  padding:
    9px 13px;

  border-radius:999px;

  background:#080808;

  color:#fff;

  font-size:8px;

  white-space:nowrap;

  opacity:0;

  pointer-events:none;

  transition:.18s ease;
}

.toast.show{

  opacity:1;

  transform:
    translateX(-50%)
    translateY(0);
}

</style>

</head>

<body>

<div
  id="productApp"
  class="productApp"
>

  <main
    id="photoStage"
    class="photoStage"
  >

    <!-- ======================================================
         FULL SCREEN PRODUCT PHOTO
         ====================================================== -->

    <img
      id="mainPhoto"
      class="mainPhoto"
      src=""
      alt="Producto CajaModa"
    >

    <!-- ======================================================
         CATEGORY QUICK NAVIGATION
         ====================================================== -->

    <nav
      id="productCategoryNav"
      class="productCategoryNav"
      aria-label="Categorías"
    ></nav>

    <!-- ======================================================
         PRODUCT PHOTO THUMBNAILS
         ====================================================== -->

    <div
      id="thumbnailRail"
      class="thumbnailRail"
    ></div>

    <!-- ======================================================
         RIGHT SIDE CONTROLS
         NUMBER > HEART > SHARE > BAG
         ====================================================== -->

    <div class="rightControls">

      <div
        id="productNumber"
        class="productNumber"
        aria-label="Número del producto"
      >
        1
      </div>

      <button
        id="favoriteButton"
        class="circleControl favoriteButton"
        aria-label="Agregar a Wishlist"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M20.3 5.7a5.2 5.2 0 0 0-7.4 0L12 6.6l-.9-.9a5.2 5.2 0 0 0-7.4 7.4L12 21l8.3-7.9a5.2 5.2 0 0 0 0-7.4Z"/>
        </svg>

      </button>

      <button
        id="shareButton"
        class="circleControl shareButton"
        aria-label="Compartir producto"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M21 3 9.7 14.3"/>
          <path d="m21 3-7 18-4.3-6.7L3 10l18-7Z"/>
        </svg>

      </button>

      <button
        id="photoBag"
        class="circleControl photoBag"
        aria-label="Abrir bolsa"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
        </svg>

        <span
          id="photoBagBadge"
          class="bagBadge"
        >
          0
        </span>

      </button>

    </div>

    <!-- ======================================================
         CLOSED PRICE CAPSULE
         ====================================================== -->

    <button
      id="priceCapsule"
      class="priceCapsule"
      aria-label="Abrir detalles del producto"
    >

      <span
        id="priceCapsuleText"
        class="priceCapsuleText"
      >
        $0 COP
      </span>

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="m9 5 7 7-7 7"/>
      </svg>

    </button>

  </main>

</div>

<!-- ==========================================================
     DETAILS
     PRICE > DESCRIPTION > COLOR > SIZE
     ========================================================== -->

<div
  id="detailsOverlay"
  class="detailsOverlay"
>

  <div
    id="detailsBackdrop"
    class="detailsBackdrop"
  ></div>

  <section
    id="detailsSheet"
    class="detailsSheet"
  >

    <div class="detailsScroll">

      <button
        id="dragHandle"
        class="dragHandle"
        aria-label="Cerrar detalles"
      ></button>

      <header class="detailsTop">

        <div>

          <div
            id="detailsTitle"
            class="detailsTitle"
          >
            Producto CajaModa
          </div>

          <div
            id="detailsPrice"
            class="detailsPrice"
          >
            $0
            <small>
              COP
            </small>
          </div>

        </div>

        <button
          id="detailsBag"
          class="detailsBag"
          aria-label="Abrir bolsa"
        >

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
            <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
          </svg>

          <span
            id="detailsBagCount"
            class="detailsBagCount"
          >
            0
          </span>

        </button>

      </header>

      <!-- DESCRIPTION -->

      <section class="descriptionBlock">

        <div class="sectionTitle">
          Descripción
        </div>

        <div
          id="descriptionText"
          class="descriptionText"
        >
          Descubre este producto CajaModa.
        </div>

        <div
          id="selectedSizeQuantities"
          class="selectedSizeQuantities"
          aria-live="polite"
        ></div>

      </section>

      <!-- COLOR -->

      <section class="optionSection">

        <div class="optionLabel">

          Color:

          <span
            id="selectedColorLabel"
            class="optionLabelValue"
          >
            Negro
          </span>

        </div>

        <div class="colorRow">

          <button
            class="colorButton colorBlack active"
            data-color="Negro"
            aria-label="Negro"
          ></button>

          <button
            class="colorButton colorRed"
            data-color="Rojo"
            aria-label="Rojo"
          ></button>

          <button
            class="colorButton colorCream"
            data-color="Crema"
            aria-label="Crema"
          ></button>

        </div>

      </section>

      <!-- SIZE -->

      <section class="optionSection">

        <div class="optionLabel">

          Talla:

          <span
            id="selectedSizeLabel"
            class="optionLabelValue"
          >
            Selecciona
          </span>

        </div>

        <div class="sizeGrid">

          <button
            class="sizeButton"
            data-size="XS"
          >
            XS
          </button>

          <button
            class="sizeButton"
            data-size="S"
          >
            S
          </button>

          <button
            class="sizeButton"
            data-size="M"
          >
            M
          </button>

          <button
            class="sizeButton"
            data-size="L"
          >
            L
          </button>

          <button
            class="sizeButton"
            data-size="XL"
          >
            XL
          </button>

        </div>

      </section>

      <!-- PURCHASE -->

      <section class="purchaseActions">

        <button
          id="addBagButton"
          class="addBagButton"
        >
          Agregar a la bolsa
        </button>

        <button
          id="buyNowButton"
          class="buyNowButton"
        >
          Comprar ahora
        </button>

        <div class="purchaseMeta">

          <span>
            Envío según disponibilidad
          </span>

          <span>
            Devoluciones según política
          </span>

        </div>

      </section>

    </div>

  </section>

</div>

<!-- ==========================================================
     WISHLIST
     ========================================================== -->

<div
  id="wishListOverlay"
  class="wishListOverlay"
  aria-hidden="true"
>

  <section
    id="wishListPanel"
    class="wishListPanel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="wishListTitle"
  >

    <header class="wishListHead">

      <div>

        <div class="wishListEyebrow">
          GUARDADO
        </div>

        <div
          id="wishListTitle"
          class="wishListTitle"
        >
          Wishlist
        </div>

      </div>

      <button
        id="wishListClose"
        class="wishListClose"
        type="button"
        aria-label="Cerrar Wishlist"
      >

        <svg viewBox="0 0 24 24">
          <path d="m7 7 10 10M17 7 7 17"/>
        </svg>

      </button>

    </header>

    <div
      id="wishListRail"
      class="wishListRail"
    ></div>

  </section>

</div>

<!-- ==========================================================
     SHARE
     ========================================================== -->

<div
  id="shareOverlay"
  class="shareOverlay"
>

  <section class="sharePanel">

    <header class="shareHead">

      <div class="shareTitle">
        Compartir producto
      </div>

      <button
        id="shareClose"
        class="shareClose"
        aria-label="Cerrar"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="m7 7 10 10M17 7 7 17"/>
        </svg>

      </button>

    </header>

    <div class="shareOptions">

      <button
        class="socialShare"
        data-share="instagram"
      >

        <span class="socialIcon">
          IG
        </span>

        <span class="socialLabel">
          Instagram
        </span>

      </button>

      <button
        class="socialShare"
        data-share="tiktok"
      >

        <span class="socialIcon">
          TT
        </span>

        <span class="socialLabel">
          TikTok
        </span>

      </button>

      <button
        class="socialShare"
        data-share="whatsapp"
      >

        <span class="socialIcon">
          W
        </span>

        <span class="socialLabel">
          WhatsApp
        </span>

      </button>

    </div>

  </section>

</div>

<!-- ==========================================================
     PLUS MENU
     ========================================================== -->

<div
  id="plusOverlay"
  class="plusOverlay"
>

  <section class="plusPanel">

    <header class="plusHead">

      <div class="plusTitle">
        ¿Cómo podemos ayudarte?
      </div>

      <button
        id="plusClose"
        class="plusClose"
        aria-label="Cerrar"
      >
        ×
      </button>

    </header>

    <div class="plusList">

      <button
        class="plusItem"
        data-plus="whatsapp"
      >
        <span>
          WhatsApp · Mensajes y pedidos
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="contact"
      >
        <span>
          Contáctanos
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="track"
      >
        <span>
          Rastrear mi pedido
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="help"
      >
        <span>
          Ayuda
        </span>

        <span>
          ›
        </span>
      </button>

    </div>

  </section>

</div>

<!-- ==========================================================
     BOTTOM NAVIGATION
     ========================================================== -->

<nav
  class="bottomNav"
  aria-label="Navegación principal"
>

  <button
    id="navPlus"
    class="navButton"
    aria-label="Más"
  >

    <span class="navPlusOrb">

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M12 5v14M5 12h14"/>
      </svg>

    </span>

  </button>

  <button
    id="navFavorites"
    class="navButton"
    aria-label="Wishlist"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M20.3 5.7a5.2 5.2 0 0 0-7.4 0L12 6.6l-.9-.9a5.2 5.2 0 0 0-7.4 7.4L12 21l8.3-7.9a5.2 5.2 0 0 0 0-7.4Z"/>
    </svg>

    <span>
      Wishlist
    </span>

  </button>

  <button
    id="navHome"
    class="navButton"
    aria-label="Inicio"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="m4 10 8-6 8 6"/>
      <path d="M6.5 9.5V20h11V9.5"/>
      <path d="M10 20v-6h4v6"/>
    </svg>

    <span>
      Inicio
    </span>

  </button>

  <button
    id="navProfile"
    class="navButton"
    aria-label="Perfil"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>
    </svg>

    <span>
      Perfil
    </span>

  </button>

  <button
    id="navBag"
    class="navButton"
    aria-label="Bolsa"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
    </svg>

    <span>
      Bolsa
    </span>

    <span
      id="navBagBadge"
      class="navBagBadge"
    >
      0
    </span>

  </button>

</nav>

<div
  id="toast"
  class="toast"
></div>

<script>

(() => {

  "use strict";

  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const CONFIG = {

    homePage:
      "/",

    checkoutPage:
      "/checkout/",

    bridgeSource:
      "CAJAMODA_IFRAME",

    acceptedSources:[
      "CAJAMODA_STOREFRONT",
      "CAJAMODA_IFRAME",
      "CAJAMODA_WIX",
      "MODAPOP_IFRAME",
      "MODAPOP_WIX"
    ],

    maxProductNumber:
      100
  };

  const CATEGORIES = [

    {
      id:"late",
      name:"Noches Largas"
    },

    {
      id:"chill",
      name:"Días Tranquilos"
    },

    {
      id:"quick",
      name:"Rápido y Fácil"
    },

    {
      id:"sun",
      name:"Baño de Sol"
    }

  ];

  /* ============================================================
     DOM
     ============================================================ */

  const $ =
    id =>
      document.getElementById(
        id
      );

  const qsa =
    (
      selector,
      root=document
    ) =>
      [
        ...root.querySelectorAll(
          selector
        )
      ];

  /* ============================================================
     STORAGE HELPERS
     ============================================================ */

  function readJson(
    key,
    fallback
  ){

    try{

      const raw =
        localStorage.getItem(
          key
        );

      if(
        !raw
      ){
        return fallback;
      }

      return JSON.parse(
        raw
      );

    }catch{

      return fallback;
    }
  }

  function saveJson(
    key,
    value
  ){

    try{

      localStorage.setItem(
        key,
        JSON.stringify(
          value
        )
      );

    }catch{}
  }

  /* ============================================================
     STATE
     ============================================================ */

  const savedFavorites =
    readJson(
      "cajamoda-favorites",
      []
    );

  const state = {

    catalog:[],

    product:null,

    categoryId:"late",

    categoryProducts:[],

    productIndex:0,

    imageIndex:0,

    selectedSize:null,

    selectedColor:"Negro",

    favorites:
      new Set(
        Array.isArray(
          savedFavorites
        )
          ? savedFavorites
            .map(String)
          : []
      )
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  function normalizeText(
    value
  ){

    return String(
      value ||
      ""
    )
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function escapeHtml(
    value
  ){

    return String(
      value ??
      ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function safeText(
    value,
    fallback=""
  ){

    return String(
      value ||
      fallback
    );
  }

  function money(
    value
  ){

    return new Intl.NumberFormat(
      "es-CO",
      {
        style:
          "currency",

        currency:
          "COP",

        maximumFractionDigits:
          0
      }
    )
      .format(
        Number(
          value ||
          0
        )
      );
  }

  function createId(){

    if(
      window.crypto?.randomUUID
    ){

      return window.crypto
        .randomUUID();
    }

    return (
      `${Date.now()}-` +
      Math.random()
        .toString(16)
        .slice(2)
    );
  }

  function show
       max-width:
    calc(
      100vw -
      30px
    );

  padding:
    9px 13px;

  border-radius:999px;

  background:#080808;

  color:#fff;

  font-size:8px;

  white-space:nowrap;

  opacity:0;

  pointer-events:none;

  transition:.18s ease;
}

.toast.show{

  opacity:1;

  transform:
    translateX(-50%)
    translateY(0);
}

</style>

</head>

<body>

<div
  id="productApp"
  class="productApp"
>

  <main
    id="photoStage"
    class="photoStage"
  >

    <!-- ======================================================
         FULL SCREEN PRODUCT PHOTO
         ====================================================== -->

    <img
      id="mainPhoto"
      class="mainPhoto"
      src=""
      alt="Producto CajaModa"
    >

    <!-- ======================================================
         CATEGORY QUICK NAVIGATION
         ====================================================== -->

    <nav
      id="productCategoryNav"
      class="productCategoryNav"
      aria-label="Categorías"
    ></nav>

    <!-- ======================================================
         PRODUCT PHOTO THUMBNAILS
         ====================================================== -->

    <div
      id="thumbnailRail"
      class="thumbnailRail"
    ></div>

    <!-- ======================================================
         RIGHT SIDE CONTROLS
         NUMBER > HEART > SHARE > BAG
         ====================================================== -->

    <div class="rightControls">

      <div
        id="productNumber"
        class="productNumber"
        aria-label="Número del producto"
      >
        1
      </div>

      <button
        id="favoriteButton"
        class="circleControl favoriteButton"
        aria-label="Agregar a Wishlist"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M20.3 5.7a5.2 5.2 0 0 0-7.4 0L12 6.6l-.9-.9a5.2 5.2 0 0 0-7.4 7.4L12 21l8.3-7.9a5.2 5.2 0 0 0 0-7.4Z"/>
        </svg>

      </button>

      <button
        id="shareButton"
        class="circleControl shareButton"
        aria-label="Compartir producto"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M21 3 9.7 14.3"/>
          <path d="m21 3-7 18-4.3-6.7L3 10l18-7Z"/>
        </svg>

      </button>

      <button
        id="photoBag"
        class="circleControl photoBag"
        aria-label="Abrir bolsa"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
        </svg>

        <span
          id="photoBagBadge"
          class="bagBadge"
        >
          0
        </span>

      </button>

    </div>

    <!-- ======================================================
         CLOSED PRICE CAPSULE
         ====================================================== -->

    <button
      id="priceCapsule"
      class="priceCapsule"
      aria-label="Abrir detalles del producto"
    >

      <span
        id="priceCapsuleText"
        class="priceCapsuleText"
      >
        $0 COP
      </span>

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="m9 5 7 7-7 7"/>
      </svg>

    </button>

  </main>

</div>

<!-- ==========================================================
     DETAILS
     PRICE > DESCRIPTION > COLOR > SIZE
     ========================================================== -->

<div
  id="detailsOverlay"
  class="detailsOverlay"
>

  <div
    id="detailsBackdrop"
    class="detailsBackdrop"
  ></div>

  <section
    id="detailsSheet"
    class="detailsSheet"
  >

    <div class="detailsScroll">

      <button
        id="dragHandle"
        class="dragHandle"
        aria-label="Cerrar detalles"
      ></button>

      <header class="detailsTop">

        <div>

          <div
            id="detailsTitle"
            class="detailsTitle"
          >
            Producto CajaModa
          </div>

          <div
            id="detailsPrice"
            class="detailsPrice"
          >
            $0
            <small>
              COP
            </small>
          </div>

        </div>

        <button
          id="detailsBag"
          class="detailsBag"
          aria-label="Abrir bolsa"
        >

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
            <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
          </svg>

          <span
            id="detailsBagCount"
            class="detailsBagCount"
          >
            0
          </span>

        </button>

      </header>

      <!-- DESCRIPTION -->

      <section class="descriptionBlock">

        <div class="sectionTitle">
          Descripción
        </div>

        <div
          id="descriptionText"
          class="descriptionText"
        >
          Descubre este producto CajaModa.
        </div>

        <div
          id="selectedSizeQuantities"
          class="selectedSizeQuantities"
          aria-live="polite"
        ></div>

      </section>

      <!-- COLOR -->

      <section class="optionSection">

        <div class="optionLabel">

          Color:

          <span
            id="selectedColorLabel"
            class="optionLabelValue"
          >
            Negro
          </span>

        </div>

        <div class="colorRow">

          <button
            class="colorButton colorBlack active"
            data-color="Negro"
            aria-label="Negro"
          ></button>

          <button
            class="colorButton colorRed"
            data-color="Rojo"
            aria-label="Rojo"
          ></button>

          <button
            class="colorButton colorCream"
            data-color="Crema"
            aria-label="Crema"
          ></button>

        </div>

      </section>

      <!-- SIZE -->

      <section class="optionSection">

        <div class="optionLabel">

          Talla:

          <span
            id="selectedSizeLabel"
            class="optionLabelValue"
          >
            Selecciona
          </span>

        </div>

        <div class="sizeGrid">

          <button
            class="sizeButton"
            data-size="XS"
          >
            XS
          </button>

          <button
            class="sizeButton"
            data-size="S"
          >
            S
          </button>

          <button
            class="sizeButton"
            data-size="M"
          >
            M
          </button>

          <button
            class="sizeButton"
            data-size="L"
          >
            L
          </button>

          <button
            class="sizeButton"
            data-size="XL"
          >
            XL
          </button>

        </div>

      </section>

      <!-- PURCHASE -->

      <section class="purchaseActions">

        <button
          id="addBagButton"
          class="addBagButton"
        >
          Agregar a la bolsa
        </button>

        <button
          id="buyNowButton"
          class="buyNowButton"
        >
          Comprar ahora
        </button>

        <div class="purchaseMeta">

          <span>
            Envío según disponibilidad
          </span>

          <span>
            Devoluciones según política
          </span>

        </div>

      </section>

    </div>

  </section>

</div>

<!-- ==========================================================
     WISHLIST
     ========================================================== -->

<div
  id="wishListOverlay"
  class="wishListOverlay"
  aria-hidden="true"
>

  <section
    id="wishListPanel"
    class="wishListPanel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="wishListTitle"
  >

    <header class="wishListHead">

      <div>

        <div class="wishListEyebrow">
          GUARDADO
        </div>

        <div
          id="wishListTitle"
          class="wishListTitle"
        >
          Wishlist
        </div>

      </div>

      <button
        id="wishListClose"
        class="wishListClose"
        type="button"
        aria-label="Cerrar Wishlist"
      >

        <svg viewBox="0 0 24 24">
          <path d="m7 7 10 10M17 7 7 17"/>
        </svg>

      </button>

    </header>

    <div
      id="wishListRail"
      class="wishListRail"
    ></div>

  </section>

</div>

<!-- ==========================================================
     SHARE
     ========================================================== -->

<div
  id="shareOverlay"
  class="shareOverlay"
>

  <section class="sharePanel">

    <header class="shareHead">

      <div class="shareTitle">
        Compartir producto
      </div>

      <button
        id="shareClose"
        class="shareClose"
        aria-label="Cerrar"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="m7 7 10 10M17 7 7 17"/>
        </svg>

      </button>

    </header>

    <div class="shareOptions">

      <button
        class="socialShare"
        data-share="instagram"
      >

        <span class="socialIcon">
          IG
        </span>

        <span class="socialLabel">
          Instagram
        </span>

      </button>

      <button
        class="socialShare"
        data-share="tiktok"
      >

        <span class="socialIcon">
          TT
        </span>

        <span class="socialLabel">
          TikTok
        </span>

      </button>

      <button
        class="socialShare"
        data-share="whatsapp"
      >

        <span class="socialIcon">
          W
        </span>

        <span class="socialLabel">
          WhatsApp
        </span>

      </button>

    </div>

  </section>

</div>

<!-- ==========================================================
     PLUS MENU
     ========================================================== -->

<div
  id="plusOverlay"
  class="plusOverlay"
>

  <section class="plusPanel">

    <header class="plusHead">

      <div class="plusTitle">
        ¿Cómo podemos ayudarte?
      </div>

      <button
        id="plusClose"
        class="plusClose"
        aria-label="Cerrar"
      >
        ×
      </button>

    </header>

    <div class="plusList">

      <button
        class="plusItem"
        data-plus="whatsapp"
      >
        <span>
          WhatsApp · Mensajes y pedidos
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="contact"
      >
        <span>
          Contáctanos
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="track"
      >
        <span>
          Rastrear mi pedido
        </span>

        <span>
          ›
        </span>
      </button>

      <button
        class="plusItem"
        data-plus="help"
      >
        <span>
          Ayuda
        </span>

        <span>
          ›
        </span>
      </button>

    </div>

  </section>

</div>

<!-- ==========================================================
     BOTTOM NAVIGATION
     ========================================================== -->

<nav
  class="bottomNav"
  aria-label="Navegación principal"
>

  <button
    id="navPlus"
    class="navButton"
    aria-label="Más"
  >

    <span class="navPlusOrb">

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M12 5v14M5 12h14"/>
      </svg>

    </span>

  </button>

  <button
    id="navFavorites"
    class="navButton"
    aria-label="Wishlist"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M20.3 5.7a5.2 5.2 0 0 0-7.4 0L12 6.6l-.9-.9a5.2 5.2 0 0 0-7.4 7.4L12 21l8.3-7.9a5.2 5.2 0 0 0 0-7.4Z"/>
    </svg>

    <span>
      Wishlist
    </span>

  </button>

  <button
    id="navHome"
    class="navButton"
    aria-label="Inicio"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="m4 10 8-6 8 6"/>
      <path d="M6.5 9.5V20h11V9.5"/>
      <path d="M10 20v-6h4v6"/>
    </svg>

    <span>
      Inicio
    </span>

  </button>

  <button
    id="navProfile"
    class="navButton"
    aria-label="Perfil"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>
    </svg>

    <span>
      Perfil
    </span>

  </button>

  <button
    id="navBag"
    class="navButton"
    aria-label="Bolsa"
  >

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M6.3 8.4h11.4l1 11H5.3l1-11Z"/>
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
    </svg>

    <span>
      Bolsa
    </span>

    <span
      id="navBagBadge"
      class="navBagBadge"
    >
      0
    </span>

  </button>

</nav>

<div
  id="toast"
  class="toast"
></div>

<script>

(() => {

  "use strict";

  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const CONFIG = {

    homePage:
      "/",

    checkoutPage:
      "/checkout/",

    bridgeSource:
      "CAJAMODA_IFRAME",

    acceptedSources:[
      "CAJAMODA_STOREFRONT",
      "CAJAMODA_IFRAME",
      "CAJAMODA_WIX",
      "MODAPOP_IFRAME",
      "MODAPOP_WIX"
    ],

    maxProductNumber:
      100
  };

  const CATEGORIES = [

    {
      id:"late",
      name:"Noches Largas"
    },

    {
      id:"chill",
      name:"Días Tranquilos"
    },

    {
      id:"quick",
      name:"Rápido y Fácil"
    },

    {
      id:"sun",
      name:"Baño de Sol"
    }

  ];

  /* ============================================================
     DOM
     ============================================================ */

  const $ =
    id =>
      document.getElementById(
        id
      );

  const qsa =
    (
      selector,
      root=document
    ) =>
      [
        ...root.querySelectorAll(
          selector
        )
      ];

  /* ============================================================
     STORAGE HELPERS
     ============================================================ */

  function readJson(
    key,
    fallback
  ){

    try{

      const raw =
        localStorage.getItem(
          key
        );

      if(
        !raw
      ){
        return fallback;
      }

      return JSON.parse(
        raw
      );

    }catch{

      return fallback;
    }
  }

  function saveJson(
    key,
    value
  ){

    try{

      localStorage.setItem(
        key,
        JSON.stringify(
          value
        )
      );

    }catch{}
  }

  /* ============================================================
     STATE
     ============================================================ */

  const savedFavorites =
    readJson(
      "cajamoda-favorites",
      []
    );

  const state = {

    catalog:[],

    product:null,

    categoryId:"late",

    categoryProducts:[],

    productIndex:0,

    imageIndex:0,

    selectedSize:null,

    selectedColor:"Negro",

    favorites:
      new Set(
        Array.isArray(
          savedFavorites
        )
          ?savedFavorites
            .map(String)
          :[]
      )
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  function normalizeText(
    value
  ){

    return String(
      value ||
      ""
    )
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function escapeHtml(
    value
  ){

    return String(
      value ??
      ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function safeText(
    value,
    fallback=""
  ){

    return String(
      value ||
      fallback
    );
  }

  function money(
    value
  ){

    return new Intl.NumberFormat(
      "es-CO",
      {
        style:
          "currency",

        currency:
          "COP",

        maximumFractionDigits:
          0
      }
    )
      .format(
        Number(
          value ||
          0
        )
      );
  }

  function createId(){

    if(
      window.crypto?.randomUUID
    ){

      return window.crypto
        .randomUUID();
    }

    return (
      `${Date.now()}-` +
      Math.random()
        .toString(16)
        .slice(2)
    );
  }

  function showToast(
    text
  ){
         const toast =
      $("toast");

    toast.textContent =
      text;

    toast.classList.add(
      "show"
    );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {

          toast.classList
            .remove(
              "show"
            );

        },
        1550
      );
  }

  /* ============================================================
     BRIDGE
     ============================================================ */

  function sendBridge(
    type,
    payload={}
  ){

    try{

      window.parent.postMessage(
        {

          source:
            CONFIG.bridgeSource,

          type,

          payload
        },
        "*"
      );

    }catch{}
  }

  function track(
    eventType,
    payload={}
  ){

    sendBridge(
      "TRACK_EVENT",
      {

        eventId:
          createId(),

        eventType,

        occurredAt:
          new Date()
            .toISOString(),

        page:
          "product",

        brand:
          "CAJAMODA",

        productId:
          state.product?.id ||
          null,

        categoryId:
          state.categoryId,

        ...payload
      }
    );
  }

  /* ============================================================
     DETERMINE PRODUCT CATEGORY
     ============================================================ */

  function getProductCategory(
    product
  ){

    if(
      !product
    ){
      return null;
    }

    const explicit =
      normalizeText(
        [
          product.category,
          product.vibeId,
          product.vibe,
          product.productType,
          product.type
        ]
          .filter(Boolean)
          .join(" ")
      );

    if(
      explicit === "late" ||
      explicit.includes(
        "noches largas"
      ) ||
      explicit.includes(
        "long nights"
      )
    ){
      return "late";
    }

    if(
      explicit === "chill" ||
      explicit.includes(
        "dias tranquilos"
      ) ||
      explicit.includes(
        "quiet days"
      )
    ){
      return "chill";
    }

    if(
      explicit === "quick" ||
      explicit.includes(
        "rapido y facil"
      ) ||
      explicit.includes(
        "quick and easy"
      )
    ){
      return "quick";
    }

    if(
      explicit === "sun" ||
      explicit.includes(
        "bano de sol"
      ) ||
      explicit.includes(
        "sunbathing"
      )
    ){
      return "sun";
    }

    const searchable =
      normalizeText(
        [
          product.name,
          product.description,
          product.productType,
          product.type,
          product.collectionName
        ]
          .filter(Boolean)
          .join(" ")
      );

    if(
      searchable.includes(
        "vestido"
      ) ||
      searchable.includes(
        "dress"
      ) ||
      searchable.includes(
        "noche"
      )
    ){
      return "late";
    }

    if(
      searchable.includes(
        "top"
      ) ||
      searchable.includes(
        "blusa"
      ) ||
      searchable.includes(
        "camisa"
      ) ||
      searchable.includes(
        "casual"
      )
    ){
      return "chill";
    }

    if(
      searchable.includes(
        "conjunto"
      ) ||
      searchable.includes(
        "set"
      )
    ){
      return "quick";
    }

    if(
      searchable.includes(
        "bikini"
      ) ||
      searchable.includes(
        "swim"
      ) ||
      searchable.includes(
        "playa"
      ) ||
      searchable.includes(
        "enterizo"
      )
    ){
      return "sun";
    }

    return (
      product.category ||
      product.vibeId ||
      null
    );
  }

  /* ============================================================
     MEDIA
     ============================================================ */

  function getMedia(
    product
  ){

    if(
      Array.isArray(
        product?.media
      )
    ){

      return product.media
        .map(
          item => {

            if(
              typeof item ===
              "string"
            ){

              return item;
            }

            return (
              item.url ||
              item.src ||
              item.imageUrl ||
              item.image?.url ||
              ""
            );

          }
        )
        .filter(Boolean);
    }

    return [
      product?.image ||
      product?.imageUrl ||
      ""
    ]
      .filter(Boolean);
  }

  /* ============================================================
     CATEGORY PRODUCT LIST
     ============================================================ */

  function rebuildCategoryProducts(){

    state.categoryProducts =
      state.catalog.filter(
        product =>
          getProductCategory(
            product
          ) ===
          state.categoryId
      );

    if(
      !state.categoryProducts.length &&
      state.product
    ){

      state.categoryProducts =
        [
          state.product
        ];
    }
  }

  /* ============================================================
     CATEGORY NAV
     ============================================================ */

  function renderCategoryNav(){

    $("productCategoryNav")
      .innerHTML =
        CATEGORIES.map(
          category => `

            <button
              class="productCategoryButton ${
                category.id ===
                state.categoryId
                  ?"active"
                  :""
              }"
              data-product-category="${category.id}"
            >

              ${escapeHtml(category.name)}

            </button>

          `
        )
          .join("");

    qsa(
      "[data-product-category]"
    )
      .forEach(
        button => {

          button.onclick =
            event => {

              event.stopPropagation();

              switchCategory(
                button.dataset
                  .productCategory
              );

            };

        }
      );

    const active =
      document.querySelector(
        ".productCategoryButton.active"
      );

    active?.scrollIntoView({
      behavior:"smooth",
      inline:"center",
      block:"nearest"
    });
  }

  function switchCategory(
    categoryId
  ){

    const category =
      CATEGORIES.find(
        item =>
          item.id ===
          categoryId
      );

    if(
      !category
    ){
      return;
    }

    const products =
      state.catalog.filter(
        product =>
          getProductCategory(
            product
          ) ===
          categoryId
      );

    if(
      !products.length
    ){

      showToast(
        `No hay productos en ${category.name}.`
      );

      return;
    }

    state.categoryId =
      categoryId;

    state.categoryProducts =
      products;

    state.productIndex =
      0;

    state.product =
      products[0];

    state.imageIndex =
      0;

    state.selectedSize =
      null;

    state.selectedColor =
      "Negro";

    resetColorControls();

    renderCategoryNav();

    renderProduct();

    track(
      "PRODUCT_CATEGORY_SWITCH",
      {
        categoryId
      }
    );
  }

  /* ============================================================
     INITIAL PRODUCT
     ============================================================ */

  function loadInitialProduct(){

    const params =
      new URLSearchParams(
        location.search
      );

    const requestedProductId =
      params.get(
        "productId"
      );

    const requestedCategory =
      params.get(
        "category"
      );

    const cachedCatalog =
      readJson(
        "cajamoda-catalog",
        []
      );

    state.catalog =
      Array.isArray(
        cachedCatalog
      )
        ?cachedCatalog
        :[];

    const cachedActive =
      readJson(
        "cajamoda-active-product",
        null
      );

    let selectedProduct =
      state.catalog.find(
        product =>
          String(
            product.id
          ) ===
          String(
            requestedProductId
          )
      ) ||
      cachedActive ||
      state.catalog[0] ||
      null;

    if(
      !selectedProduct
    ){

      renderEmptyProduct();

      renderCategoryNav();

      return;
    }

    state.product =
      selectedProduct;

    const actualCategory =
      getProductCategory(
        selectedProduct
      );

    const validRequested =
      CATEGORIES.some(
        category =>
          category.id ===
          requestedCategory
      );

    state.categoryId =
      actualCategory ||
      (
        validRequested
          ?requestedCategory
          :"late"
      );

    rebuildCategoryProducts();

    const foundIndex =
      state.categoryProducts
        .findIndex(
          product =>
            String(
              product.id
            ) ===
            String(
              selectedProduct.id
            )
        );

    state.productIndex =
      foundIndex >= 0
        ?foundIndex
        :0;

    if(
      foundIndex < 0 &&
      state.categoryProducts.length
    ){

      state.product =
        state.categoryProducts[0];
    }

    renderCategoryNav();

    renderProduct();
  }

  function renderEmptyProduct(){

    $("mainPhoto")
      .removeAttribute(
        "src"
      );

    $("priceCapsuleText")
      .textContent =
        "Producto no disponible";

    $("detailsTitle")
      .textContent =
        "Producto no disponible";

    $("detailsPrice")
      .innerHTML =
        "$0 <small>COP</small>";
  }

  /* ============================================================
     RENDER PRODUCT
     ============================================================ */

  function renderProduct(){

    const product =
      state.product;

    if(
      !product
    ){
      return;
    }

    const media =
      getMedia(
        product
      );

    state.imageIndex =
      Math.min(
        state.imageIndex,
        Math.max(
          0,
          media.length -
          1
        )
      );

    const currentImage =
      media[
        state.imageIndex
      ] ||
      product.image ||
      "";

    const photo =
      $("mainPhoto");

    photo.classList.add(
      "changing"
    );

    setTimeout(
      () => {

        photo.src =
          currentImage;

        photo.alt =
          safeText(
            product.name,
            "Producto CajaModa"
          );

        photo.classList.remove(
          "changing"
        );

      },
      70
    );

    $("priceCapsuleText")
      .textContent =
        `${money(product.price)} COP`;

    $("detailsTitle")
      .textContent =
        safeText(
          product.name,
          "Producto CajaModa"
        );

    $("detailsPrice")
      .innerHTML =
        `${money(product.price)} <small>COP</small>`;

    $("descriptionText")
      .textContent =
        safeText(
          product.description,
          "Producto seleccionado de CajaModa. Elige tu color y tu talla para agregarlo a tu bolsa."
        );

    /*
      Number always represents position inside
      the active category.
    */

    const number =
      Math.min(
        CONFIG.maxProductNumber,
        state.productIndex +
        1
      );

    $("productNumber")
      .textContent =
        String(
          number
        );

    state.selectedSize =
      null;

    $("selectedSizeLabel")
      .textContent =
        "Selecciona";

    renderSizeState();

    renderSelectedSizeQuantities();

    renderThumbnails();

    syncFavoriteUI();

    syncBagCount();

    saveJson(
      "cajamoda-active-product",
      product
    );

    updateUrlWithoutReload();
  }

  function updateUrlWithoutReload(){

    if(
      !state.product
    ){
      return;
    }

    const url =
      new URL(
        location.href
      );

    url.searchParams.set(
      "productId",
      state.product.id
    );

    url.searchParams.set(
      "category",
      state.categoryId
    );

    history.replaceState(
      null,
      "",
      url
    );
  }

  /* ============================================================
     THUMBNAILS
     ============================================================ */

  function renderThumbnails(){

    const media =
      getMedia(
        state.product
      );

    const five =
      media.slice(
        0,
        5
      );

    while(
      five.length <
      5
    ){

      five.push(
        ""
      );
    }

    $("thumbnailRail")
      .innerHTML =
        five
          .slice(
            1,
            5
          )
          .map(
            (
              url,
              index
            ) => {

              const actualIndex =
                index +
                1;

              return `

                <button
                  class="thumbnail ${
                    actualIndex ===
                    state.imageIndex
                      ?"active"
                      :""
                  }"
                  data-image-index="${actualIndex}"
                  aria-label="Foto ${actualIndex + 1}"
                >

                  ${
                    url
                      ?`
                        <img
                          src="${escapeHtml(url)}"
                          alt=""
                        >
                      `
                      :`
                        <div class="thumbnailPlaceholder">
                          FOTO
                        </div>
                      `
                  }

                </button>

              `;

            }
          )
          .join("");

    qsa(
      "[data-image-index]"
    )
      .forEach(
        button => {

          button.onclick =
            event => {

              event.stopPropagation();

              const index =
                Number(
                  button.dataset
                    .imageIndex
                );

              const media =
                getMedia(
                  state.product
                );

              if(
                !media[index]
              ){
                return;
              }

              changePhoto(
                index
              );

            };

        }
      );
  }

  function changePhoto(
    index
  ){

    const media =
      getMedia(
        state.product
      );

    if(
      !media[index]
    ){
      return;
    }

    const image =
      $("mainPhoto");

    image.classList.add(
      "changing"
    );

    setTimeout(
      () => {

        state.imageIndex =
          index;

        image.src =
          media[index];

        renderThumbnails();

        image.classList.remove(
          "changing"
        );

      },
      90
    );
  }

  /* ============================================================
     PRODUCT SWIPE
     LEFT = NEXT
     RIGHT = PREVIOUS
     ALWAYS INSIDE ACTIVE CATEGORY
     ============================================================ */

  let pointerStartX =
    0;

  let pointerStartY =
    0;

  let pointerStartedOnControl =
    false;

  let pointerTracking =
    false;

  $("photoStage")
    .addEventListener(
      "pointerdown",
      event => {

        pointerStartedOnControl =
          !!event.target.closest(
            "button,nav"
          );

        if(
          pointerStartedOnControl
        ){

          pointerTracking =
            false;

          return;
        }

        pointerTracking =
          true;

        pointerStartX =
          event.clientX;

        pointerStartY =
          event.clientY;

      }
    );

  $("photoStage")
    .addEventListener(
      "pointerup",
      event => {

        if(
          !pointerTracking
        ){
          return;
        }

        pointerTracking =
          false;

        if(
          $("detailsOverlay")
            .classList
            .contains(
              "open"
            )
        ){
          return;
        }

        const dx =
          event.clientX -
          pointerStartX;

        const dy =
          event.clientY -
          pointerStartY;

        /*
          Require a real horizontal swipe.
        */

        if(
          Math.abs(
            dx
          ) <
          45
        ){
          return;
        }

        if(
          Math.abs(
            dx
          ) <=
          Math.abs(
            dy
          )
        ){
          return;
        }

        if(
          dx <
          0
        ){

          nextProduct();

        }else{

          previousProduct();
        }

      }
    );

  $("photoStage")
    .addEventListener(
      "pointercancel",
      () => {

        pointerTracking =
          false;
      }
    );

  function nextProduct(){

    if(
      state.categoryProducts.length <
      2
    ){

      showToast(
        "No hay otro producto en esta categoría."
      );

      return;
    }

    state.productIndex =
      (
        state.productIndex +
        1
      ) %
      state.categoryProducts.length;

    state.product =
      state.categoryProducts[
        state.productIndex
       ### Block 5 of 6

```html
      ];

    state.imageIndex =
      0;

    state.selectedSize =
      null;

    state.selectedColor =
      "Negro";

    resetColorControls();

    renderProduct();

    track(
      "PRODUCT_SWIPE",
      {
        direction:"left",
        productIndex:
          state.productIndex +
          1
      }
    );
  }

  function previousProduct(){

    if(
      state.categoryProducts.length <
      2
    ){

      showToast(
        "No hay otro producto en esta categoría."
      );

      return;
    }

    state.productIndex =
      (
        state.productIndex -
        1 +
        state.categoryProducts.length
      ) %
      state.categoryProducts.length;

    state.product =
      state.categoryProducts[
        state.productIndex
      ];

    state.imageIndex =
      0;

    state.selectedSize =
      null;

    state.selectedColor =
      "Negro";

    resetColorControls();

    renderProduct();

    track(
      "PRODUCT_SWIPE",
      {
        direction:"right",
        productIndex:
          state.productIndex +
          1
      }
    );
  }

  /* ============================================================
     DETAILS
     ============================================================ */

  function openDetails(){

    $("detailsOverlay")
      .classList
      .add(
        "open"
      );

    document.body
      .classList
      .add(
        "locked"
      );

    syncBagCount();

    track(
      "PRODUCT_DETAILS_OPEN"
    );
  }

  function closeDetails(){

    $("detailsOverlay")
      .classList
      .remove(
        "open"
      );

    document.body
      .classList
      .remove(
        "locked"
      );
  }

  $("priceCapsule")
    .onclick =
      openDetails;

  $("detailsBackdrop")
    .onclick =
      closeDetails;

  $("dragHandle")
    .onclick =
      closeDetails;

  /* ============================================================
     CART
     ============================================================ */

  function normalizePrice(
    ...candidates
  ){

    function readCandidate(
      candidate
    ){

      if(
        candidate === null ||
        candidate === undefined ||
        candidate === ""
      ){
        return null;
      }

      if(
        typeof candidate ===
        "object"
      ){

        const nestedCandidates = [
          candidate.amount,
          candidate.value,
          candidate.discountedPrice,
          candidate.price
        ];

        for(
          const nestedCandidate
          of nestedCandidates
        ){

          const nested =
            readCandidate(
              nestedCandidate
            );

          if(
            nested !== null
          ){
            return nested;
          }
        }

        return null;
      }

      const numeric =
        Number(
          candidate
        );

      return Number.isFinite(
        numeric
      )
        ?numeric
        :null;
    }

    for(
      const candidate
      of candidates
    ){

      const numeric =
        readCandidate(
          candidate
        );

      if(
        numeric !== null
      ){
        return numeric;
      }
    }

    return 0;
  }

  function normalizeChoice(
    value
  ){

    return String(
      value ||
      ""
    )
      .toLowerCase()
      .trim();
  }

  function cartLineKey(
    item
  ){

    const productId =
      String(
        item?.productId ||
        ""
      );

    const variantId =
      String(
        item?.variantId ||
        ""
      );

    if(
      variantId
    ){

      return (
        `${productId}:variant:${variantId}`
      );
    }

    return [
      productId,
      "options",
      normalizeChoice(
        item?.size
      ),
      normalizeChoice(
        item?.color
      )
    ]
      .join(
        ":"
      );
  }

  function normalizeCart(
    cart
  ){

    const sourceItems =
      Array.isArray(
        cart?.items
      )
        ?cart.items
        :Array.isArray(
          cart?.lineItems
        )
          ?cart.lineItems
          :[];

    const items =
      sourceItems.map(
        item => ({

          id:
            item.id ||
            item._id ||
            item.lineItemId ||
            createId(),

          productId:
            item.productId ||
            item.catalogReference
              ?.catalogItemId ||
            null,

          variantId:
            item.variantId ||
            item.catalogReference
              ?.options
              ?.variantId ||
            null,

          name:
            item.name ||
            item.productName ||
            "Producto",

          image:
            item.image ||
            item.imageUrl ||
            item.media?.url ||
            "",

          size:
            item.size ||
            item.options?.Size ||
            item.options?.size ||
            "",

          color:
            item.color ||
            item.options?.Color ||
            item.options?.color ||
            "Negro",

          quantity:
            Math.max(
              1,
              Number(
                item.quantity ||
                1
              )
            ),

          unitPrice:
            normalizePrice(
              item.unitPrice,
              item.price,
              item.lineItemPrice
            ),

          price:
            normalizePrice(
              item.unitPrice,
              item.price,
              item.lineItemPrice
            ),

          autoSelected:
            item.autoSelected ===
            true
        })
      );

    const count =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.quantity,
        0
      );

    const total =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          (
            item.unitPrice *
            item.quantity
          ),
        0
      );

    return{

      items,

      count,

      total
    };
  }

  function readCart(){

    return normalizeCart(
      readJson(
        "cajamoda-cart",
        {
          items:[],
          count:0,
          total:0
        }
      )
    );
  }

  function saveCart(
    cart
  ){

    const normalized =
      normalizeCart(
        cart
      );

    saveJson(
      "cajamoda-cart",
      normalized
    );

    syncBagCount();

    return normalized;
  }

  function syncBagCount(){

    const cart =
      readCart();

    const count =
      cart.count;

    [
      $("photoBagBadge"),
      $("navBagBadge"),
      $("detailsBagCount")
    ]
      .forEach(
        badge => {

          if(
            badge
          ){

            badge.textContent =
              String(
                count
              );
          }

        }
      );
  }

  function animateBag(){

    const badge =
      $("photoBagBadge");

    if(
      !badge
    ){
      return;
    }

    badge.classList.remove(
      "bump"
    );

    void badge.offsetWidth;

    badge.classList.add(
      "bump"
    );
  }

  /* ============================================================
     SIZE SELECTION
     ============================================================ */

  function findExistingAutoLine(
    productId
  ){

    const cart =
      readCart();

    return cart.items.find(
      item =>
        String(
          item.productId
        ) ===
        String(
          productId
        ) &&
        item.autoSelected ===
        true
    ) ||
    null;
  }

  function findExistingSelectedSize(
    productId
  ){

    const line =
      findExistingAutoLine(
        productId
      );

    return line?.size ||
      null;
  }

  function renderSizeState(){

    const selectedSizes =
      new Set(
        readCart().items
          .filter(
            item =>
              String(
                item.productId
              ) ===
                String(
                  state.product?.id
                ) &&
              item.autoSelected ===
                true
          )
          .map(
            item =>
              normalizeChoice(
                item.size
              )
          )
      );

    qsa(
      "[data-size]"
    )
      .forEach(
        button => {

          button.classList.toggle(
            "selected",
            selectedSizes.has(
              normalizeChoice(
                button.dataset.size
              )
            )
          );

        }
      );
  }

  function selectedSizeLines(){

    return readCart().items.filter(
      item =>
        String(
          item.productId
        ) ===
          String(
            state.product?.id
          ) &&
        item.autoSelected ===
          true
    );
  }

  function renderSelectedSizeQuantities(){

    const container =
      $("selectedSizeQuantities");

    if(
      !container
    ){
      return;
    }

    const lines =
      selectedSizeLines();

    container.innerHTML =
      lines.map(
        line => `

          <div class="selectedSizeQuantity">

            <span class="selectedSizeName">
              Talla ${escapeHtml(line.size || "—")}
            </span>

            <span class="selectedSizeControls">

              <button
                type="button"
                data-size-minus="${escapeHtml(line.id)}"
                aria-label="Reducir talla ${escapeHtml(line.size || "")}"
              >
                −
              </button>

              <span>
                ${Math.max(1,Number(line.quantity)||1)}
              </span>

              <button
                type="button"
                data-size-plus="${escapeHtml(line.id)}"
                aria-label="Aumentar talla ${escapeHtml(line.size || "")}"
              >
                +
              </button>

            </span>

          </div>

        `
      )
        .join("");
  }

  function removeSelectedSize(
    size
  ){

    const cart =
      readCart();

    cart.items =
      cart.items.filter(
        item =>
          !(
            String(
              item.productId
            ) ===
              String(
                state.product?.id
              ) &&
            normalizeChoice(
              item.size
            ) ===
              normalizeChoice(
                size
              ) &&
            item.autoSelected ===
              true
          )
      );

    saveCart(
      cart
    );

    sendBridge(
      "ADD_TO_CART",
      {
        selectionMode:
          "SIZE_DESELECTION"
      }
    );
  }

  function changeSelectedSizeQuantity(
    itemId,
    delta
  ){

    const cart =
      readCart();

    const line =
      cart.items.find(
        item =>
          String(
            item.id
          ) ===
          String(
            itemId
          )
      );

    if(
      !line
    ){
      return;
    }

    line.quantity =
      Math.max(
        0,
        (
          Number(
            line.quantity
          ) ||
          1
        ) +
        delta
      );

    if(
      line.quantity ===
      0
    ){

      cart.items =
        cart.items.filter(
          item =>
            String(
              item.id
            ) !==
            String(
              itemId
            )
        );
    }

    saveCart(
      cart
    );

    sendBridge(
      "ADD_TO_CART",
      {
        selectionMode:
          "QUANTITY_CHANGE"
      }
    );

    renderSizeState();

    renderSelectedSizeQuantities();
  }

  function selectSize(
    size
  ){

    if(
      !state.product
    ){
      return;
    }

    const alreadySelected =
      selectedSizeLines()
        .some(
          item =>
            normalizeChoice(
              item.size
            ) ===
            normalizeChoice(
              size
            )
        );

    if(
      alreadySelected
    ){

      removeSelectedSize(
        size
      );

      state.selectedSize =
        null;

      $("selectedSizeLabel")
        .textContent =
          "Selecciona";

      renderSizeState();

      renderSelectedSizeQuantities();

      showToast(
        `Talla ${size} eliminada de la bolsa.`
      );

      return;
    }

    state.selectedSize =
      size;

    $("selectedSizeLabel")
      .textContent =
        size;

    renderSizeState();

    syncSelectionToBag();

    renderSizeState();

    renderSelectedSizeQuantities();

    animateBag();

    if(
      navigator.vibrate
    ){

      navigator.vibrate(
        20
      );
    }

    showToast(
      `Talla ${size} agregada a la bolsa.`
    );

    track(
      "SIZE_SELECTED",
      {
        size,
        color:
          state.selectedColor
      }
    );
  }

  qsa(
    "[data-size]"
  )
    .forEach(
      button => {

        button.onclick =
          () => {

            selectSize(
              button.dataset.size
            );

          };

      }
    );

  /* ============================================================
     COLORS
     ============================================================ */

  function resetColorControls(){

    state.selectedColor =
      "Negro";

    $("selectedColorLabel")
      .textContent =
        "Negro";

    qsa(
      "[data-color]"
    )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button.dataset.color ===
              "Negro"
          );

        }
      );
  }

  $("selectedSizeQuantities")
    .addEventListener(
      "click",
      event => {

        const minus =
          event.target.closest(
            "[data-size-minus]"
          );

        const plus =
          event.target.closest(
            "[data-size-plus]"
          );

        if(
          minus
        ){

          changeSelectedSizeQuantity(
            minus.dataset.sizeMinus,
            -1
          );
        }

        if(
          plus
        ){

          changeSelectedSizeQuantity(
            plus.dataset.sizePlus,
            1
          );
        }

      }
    );

  function selectColor(
    color,
    selectedButton
  ){

    state.selectedColor =
      color;

    $("selectedColorLabel")
      .textContent =
        color;

    qsa(
      "[data-color]"
    )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button ===
              selectedButton
          );

        }
      );

    if(
      state.selectedSize
    ){

      syncSelectionToBag();
    }

    track(
      "COLOR_SELECTED",
      {
        color
      }
    );
  }

  qsa(
    "[data-color]"
  )
    .forEach(
      button => {

        button.onclick =
          () => {

            selectColor(
              button.dataset.color,
              button
            );

          };

      }
    );

  /* ============================================================
     AUTO ADD TO BAG
     ============================================================ */

  function syncSelectionToBag(){

    if(
      !state.product ||
      !state.selectedSize
    ){
      return null;
    }

    const cart =
      readCart();

    const selectedVariant =
      state.product
        ?.variants
        ?.find(
          variant =>
            normalizeChoice(
              variant.size
            ) ===
              normalizeChoice(
                state.selectedSize
              ) &&
            (
              !variant.color ||
              normalizeChoice(
                variant.color
              ) ===
                normalizeChoice(
                  state.selectedColor
                )
            )
        ) ||
      state.product
        ?.variants
        ?.find(
          variant =>
            normalizeChoice(
              variant.size
            ) ===
              normalizeChoice(
                state.selectedSize
              )
        ) ||
      null;

    const variantId =
      selectedVariant?.id ||
      null;

    const desiredKey =
      cartLineKey({
        productId:
          state.product.id,

        variantId,

        size:
          state.selectedSize,

        color:
          state.selectedColor
      });

    let line =
      cart.items.find(
        item =>
          cartLineKey(
            item
          ) ===
            desiredKey &&
          item.autoSelected ===
            true
      ) ||
      cart.items.find(
        item =>
          !item.variantId &&
          String(
            item.productId
          ) ===
            String(
              state.product.id
            ) &&
          normalizeChoice(
            item.size
          ) ===
            normalizeChoice(
              state.selectedSize
            ) &&
          normalizeChoice(
            item.color
          ) ===
            normalizeChoice(
              state.selectedColor
            ) &&
          item.autoSelected ===
            true
      );

    const image =
      getMedia(
        state.product
      )[0] ||
      state.product.image ||
      "";

    if(
      line
    ){

      line.size =
        state.selectedSize;

      line.color =
        state.selectedColor;

      line.name =
        state.product.name;

      line.image =
        image;

      line.variantId =
        variantId;

      line.unitPrice =
        normalizePrice(
          selectedVariant?.price,
          state.product.price
        );

      line.price =
        line.unitPrice;

    }else{

      line = {

        id:
          `selection-${desiredKey}`,

        productId:
          state.product.id,

        variantId,

        name:
          state.product.name,

        image,

        size:
          state.selectedSize,

        color:
          state.selectedColor,

        quantity:
          1,

        unitPrice:
          normalizePrice(
            selectedVariant?.price,
            state.product.price
          ),

        price:
          normalizePrice(
            selectedVariant?.price,
            state.product.price
          ),

        autoSelected:
          true
      };

      cart.items.push(
        line
      );
    }

    const saved =
      saveCart(
        cart
      );

    sendBridge(
      "ADD_TO_CART",
      {

        productId:
          state.product.id,

        size:
          state.selectedSize,

        color:
          state.selectedColor,

        quantity:
          1,

        selectionMode:
          "SIZE_SELECTION"
      }
    );

    return saved;
  }

  /* ============================================================
     ADD TO BAG
     ============================================================ */

  $("addBagButton")
    .onclick =
      () => {

        if(
          !state.selectedSize
        ){

          showToast(
            "Selecciona una talla."
          );

          return;
        }

        syncSelectionToBag();

        animateBag();

        showToast(
          "Producto guardado en tu bolsa."
        );

        if(
          navigator.vibrate
        ){

          navigator.vibrate(
            18
          );
        }
      };

  /* ============================================================
     BUY NOW
     ============================================================ */

  $("buyNowButton")
    .onclick =
      () => {

        if(
          !state.selectedSize
        ){

          showToast(
            "Selecciona una talla."
          );

          return;
        }

        const cart =
          syncSelectionToBag() ||
          readCart();

        saveJson(
          "cajamoda-checkout-cart",
          cart
        );

        track(
          "BUY_NOW",
          {
            cartCount:
              cart.count,

            size:
              state.selectedSize,

            color:
              state.selectedColor
          }
        );

        location.href =
          CONFIG.checkoutPage;
      };

  /* ============================================================
     FAVORITE
     ============================================================ */

  let wishListAutoCloseTimer =
    null;

  function isFavorite(){

    return (
      state.product &&
      state.favorites.has(
        String(
          state.product.id
        )
      )
    );
```

   
