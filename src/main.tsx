import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc, PageEntity, BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

const pluginId = PL.id;

let root: HTMLElement;
let body: HTMLElement;

type AssetsRecord = {
  [prop: string]: Assets;
}

type Assets = {
  iconHeight?: string,
  bannerHeight?: string;
  banner?: string;
  pageIcon?: string;
}

type UseDefaultType = {
  banner: boolean;
  pageIcon: boolean;
}

type AssetType = keyof UseDefaultType;

let pageType: string;
let isJournal: boolean;
let currentPageProps: PageEntity | null;
let useDefault: UseDefaultType;
let defaultConfig: AssetsRecord;
let customPropsConfig: AssetsRecord;
let timeout: number;
let hidePluginProps: boolean;

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsArray: SettingSchemaDesc[] = [
  {
    key: "bannerHeading",
    title: "Banner settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "pageBannerHeight",
    title: "Banner height for common page",
    type: "string",
    description: "",
    default: "200px",
  },
  {
    key: "journalBannerHeight",
    title: "Banner height for journal & home page",
    type: "string",
    description: "",
    default: "300px",
  },
  {
    key: "useDefaultBanner",
    title: "",
    type: "boolean",
    description: "Use default banner (settings below) when 'banner::' property is not set?",
    default: true,
  },
  {
    key: "defaultPageBanner",
    title: "Default banner for common page",
    type: "string",
    description: "",
    default: settingsDefaultPageBanner,
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page",
    type: "string",
    description: "",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "iconHeading",
    title: "Icon settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "pageIconHeight",
    title: "Icon height for common page (in px)",
    type: "string",
    description: "",
    default: "40px",
  },
  {
    key: "journalIconHeight",
    title: "Icon height for journal & home page (in px)",
    type: "string",
    description: "",
    default: "50px",
  },
  {
    key: "useDefaultIcon",
    title: "",
    type: "boolean",
    description: "Use default icon (settings below) when 'icon::' or 'page-icon::' property is not set?",
    default: true,
  },
  {
    key: "defaultPageIcon",
    title: "Default icon (emoji) for common page",
    type: "string",
    description: "",
    default: "📄",
  },
  {
    key: "defaultJournalIcon",
    title: "Default icon (emoji) for journal and home page",
    type: "string",
    description: "",
    default: "📅",
  },
  {
    key: "otherHeading",
    title: "Other settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "hidePluginProps",
    title: "",
    type: "boolean",
    description: "Hide plugin-related page props? (will be shown only on edit)",
    default: "false",
  },
  {
    key: "customPropsConfig",
    title: "Advanced custom pages banners and icons config",
    type: "object",
    description: "",
    default: {
      "pageType": {
        "evrgrn": {
          "pageIcon": "🌳",
          "banner": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
        },
        "seed": {
          "pageIcon": "🌱",
          "banner": "https://images.unsplash.com/photo-1631949454967-6c6d07fb59cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
        }
      },
      "anotherCamalCasedPropName": {}
    }
  },
  {
    key: "timeout",
    title: "Banner render timeout",
    type: "number",
    description: "If your Logseq pages too slow and render glitches - try set bigger value...500, 1000, 1500 (milliseconds). Caution! Banners will render slower (but morre stable)!",
    default: "100",
  }
]

const initStyles = () => {
  logseq.provideStyle(`
    body:is([data-page="page"],[data-page="home"]).is-banner-active #main-content-container {
      flex-wrap: wrap;
      align-content: flex-start;
    }
    body:is([data-page="page"],[data-page="home"]) .content {
      position: relative;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active #main-content-container::before {
      display: block;
      content: "";
      width: 100%;
      height: var(--bannerHeight);
      margin: 0 auto;
      background-image: var(--pageBanner);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: 50%;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .journal-item:first-of-type > .page > .flex-col > .content > .flex-1::before,
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active .page > .relative > .flex-row > .flex-1::before {
      content: var(--pageIcon);
      font-size: var(--iconHeight);
      font-weight: normal;
      position: absolute;
      left: -7px;
      z-index:2;
      transform: translateY(-55%);
      line-height: initial;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active :is(.ls-page-title, .page-title, .journal-title) {
      margin-top: 35px;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-child {
      margin-top: 0;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item h1.title::before {
      content: "${defaultConfig.journal.pageIcon}";
      margin-right: 8px;
      font-size: 0.9em;
      font-weight: normal;
    }
    body:is([data-page="page"],[data-page="home"]).is-banner-active.is-icon-active #journals .journal-item:first-of-type h1.title::before {
      display: none;
    }
    .cp__right-sidebar-inner .resizer {
      z-index:9;
    }
    .page-title .page-icon {
      display: none;
    }
  `)
}

// Read settings
const readPluginSettings = () => {
  useDefault = {
    banner: false,
    pageIcon: false
  };
  defaultConfig = {
    page: {},
    journal: {}
  }
  const pluginSettings = logseq.settings;
  if (pluginSettings) {
    ({
      hidePluginProps,
      useDefaultBanner: useDefault.banner,
      useDefaultIcon: useDefault.pageIcon,
      pageBannerHeight: defaultConfig.page.bannerHeight,
      pageIconHeight: defaultConfig.page.iconHeight,
      defaultPageBanner: defaultConfig.page.banner,
      defaultPageIcon: defaultConfig.page.pageIcon,
      journalBannerHeight: defaultConfig.journal.bannerHeight,
      journalIconHeight: defaultConfig.journal.iconHeight,
      defaultJournalBanner: defaultConfig.journal.banner,
      defaultJournalIcon: defaultConfig.journal.pageIcon,
      customPropsConfig,
      timeout
    } = pluginSettings);
  }
  if (useDefault.banner) {
    encodeDefaultBanners();
  }
}

// Hide props
const hideProps = () => {
  const propBlockKeys = top?.document.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      if (propBlockKeys[i].textContent === "banner" || propBlockKeys[i].textContent === "page-icon" || propBlockKeys[i].textContent === "icon") {
        propBlockKeys[i].parentElement!.style.display = hidePluginProps ? "none" : "block" ;
      }
    }
  }
}

// Render
const render = async () => {
  hideProps();
  // "Delete" icon on ever render start if no default allowed
  if (!useDefault.pageIcon) {
    clearIcon();
  }
  // "Delete" banner on ever render start if no default allowed
  if (!useDefault.banner) {
    clearBanner();
  }
  pageType = getPageType();
  if (!isPageTypeOk()) {
    clearIcon();
    clearBanner();
    return;
  }
  currentPageProps = null;
  if (pageType !== "home") {
    currentPageProps = await getPageProps();
  }
  renderBanner();
}

// Get page type
const getPageType = () => {
  return body.getAttribute("data-page")!;
}

// Skip "system pasges", show/hide banner and icon
const isPageTypeOk = () => {
  if (pageType === "page" || pageType === "home") {
    return true;
  }
  return false;
}

const getPageProps = async () => {
  let currentPageData: PageEntity | BlockEntity | null = null;
  currentPageData = await logseq.Editor.getCurrentPage();
  if (currentPageData) {
    // Check if page is a child and get parent ID
   //@ts-expect-error
    const currentPageId = currentPageData.page?.id;
    if (currentPageId) {
      currentPageData = null;
      currentPageData = await logseq.Editor.getPage(currentPageId);
    }
    if (currentPageData) {
      //@ts-expect-error
      currentPageProps = currentPageData.properties;
    }
  }
  isJournal = currentPageData?.["journal?"];
  return currentPageProps;
}

// Generate Base64 from image URL
const getBase64FromUrl = async (url: string): Promise<string> => {
  let data;
  try {
    data = await fetch(url);
  } catch (error) {
    return "";
  }
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    }
  });
}

// Get and encode default banners for caching
// skip caching if random image from Unsplash API used
const encodeDefaultBanners = async () => {
  if (defaultConfig.page.banner && !(defaultConfig.page.banner?.includes("source.unsplash.com"))) {
    defaultConfig.page.banner = await getBase64FromUrl(defaultConfig.page.banner);
  }
  if (defaultConfig.journal.banner && !(defaultConfig.journal.banner?.includes("source.unsplash.com"))) {
    defaultConfig.journal.banner = await getBase64FromUrl(defaultConfig.journal.banner);
  }
}

// Read from cusrom page props config
const getCustomPropsAsset = (assetType: AssetType) => {
  console.info(`#${pluginId}: Trying ${assetType} from custom JSON settings`);
  let customPropsAsset = "";
  for (const key of Object.keys(customPropsConfig)) {
    //@ts-expect-error
    const pageCustomProp = currentPageProps?.[key];
    if (pageCustomProp) {
      const pageCustomPropValue = Array.isArray(pageCustomProp) ? pageCustomProp[0] : pageCustomProp;
      if (pageCustomPropValue) {
        //@ts-expect-error
        customPropsAsset = customPropsConfig?.[key]?.[pageCustomPropValue]?.[assetType];
      }
    }
  }
  return customPropsAsset;
}

// Read banner from page props
const getPropsAsset = async (assetType: AssetType) => {
  console.info(`#${pluginId}: Trying ${assetType} from page props`);
  let propsAsset = "";
  //@ts-expect-error
  propsAsset = currentPageProps?.[assetType];
  if (propsAsset && assetType === "banner") {
    //remove surrounding quotations if present
    propsAsset = propsAsset.replace(/^"(.*)"$/, '$1');
    // if local image from assets folder
    if (propsAsset.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      propsAsset = encodeURI("assets://" + graphPath + propsAsset.replace("..", ""));
    }
  }
  if (!propsAsset && assetType === "pageIcon") {
    console.info(`#${pluginId}: Trying icon from Logseq native icon prop`);
    //@ts-expect-error
    propsAsset = currentPageProps?.icon;
  }
  return propsAsset;
}

// Check journals home page
const getHomeAsset = (assetType: AssetType): string => {
  let homeAsset = "";
  if (useDefault[assetType]) {
    console.info(`#${pluginId}: Trying ${assetType} from default settings (journal), home page`);
    //@ts-expect-error
    homeAsset = defaultConfig.journal[assetType];
  }
  return homeAsset;
}

// Default page or journal banner?
const chooseDefaultAsset = (assetType: AssetType) => {
  let defaultAsset = "";
  console.info(`#${pluginId}: Trying ${assetType} from default settings`);
  //@ts-expect-error
  defaultAsset = isJournal ? defaultConfig.journal[assetType] : defaultConfig.page[assetType];
  return defaultAsset;
}


// Get asset
const getAsset = async (assetType: AssetType): Promise<string> => {
  let asset = "";
  // Check journals home page
  if (pageType === "home") {
    isJournal = true;
    asset = getHomeAsset(assetType);
    return asset;
  }
  // Read from page props
  asset = await getPropsAsset(assetType);
  // Read from custom props
  if (!asset && customPropsConfig) {
    asset = getCustomPropsAsset(assetType);
  }
  // Use default if no props and allows default
  if (!asset && useDefault[assetType]) {
    return chooseDefaultAsset(assetType);
  }
  console.info(`#${pluginId}: ${assetType} - ${asset}`);
  return asset;
}

// Set banner CSS variable
const renderBanner = async () => {
  const pageBanner = await getAsset("banner");
  if (pageBanner) {
    renderIcon();
    body.classList.add("is-banner-active");
    const bannerHeight = isJournal ? defaultConfig.journal.bannerHeight : defaultConfig.page.bannerHeight
    root.style.setProperty("--bannerHeight", `${bannerHeight}`);
    root.style.setProperty("--pageBanner", `url(${pageBanner})`);
  } else {
    clearBanner();
  }
}

// Set icon CSS variable
const renderIcon = async () => {
  const pageIcon = await getAsset("pageIcon");
  if (pageIcon) {
    body.classList.add("is-icon-active");
    const iconHeight = isJournal ? defaultConfig.journal.iconHeight : defaultConfig.page.iconHeight
    root.style.setProperty("--iconHeight", `${iconHeight}`);
    root.style.setProperty("--pageIcon", `"${pageIcon}"`);
  } else {
    clearIcon();
  }
}

// Page props was edited
let propsChangedObserverConfig: MutationObserverInit,
  propsChangedObserver: MutationObserver;
const propsChangedObserverInit = () => {
  propsChangedObserverConfig = {
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
    subtree: true
  }
  const propsChangedCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
      if (mutationsList[i].oldValue?.includes("pre-block")){
        console.info(`#${pluginId}: page props - deleted`);
        render();
        return;
      }
      //@ts-expect-error
      if (mutationsList[i]?.target?.offsetParent.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
        console.info(`#${pluginId}: page props - edited or added`);
        render();
      }
    }
  }
  propsChangedObserver = new MutationObserver(propsChangedCallback);
}
const propsChangedObserverRun = () => {
  const preBlock = top?.document.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
}

// Hide banner element
const clearBanner = () => {
  body.classList.remove("is-banner-active");
  root.style.setProperty("--pageBanner", "");
}

// Hide icon element
const clearIcon = () => {
  body.classList.remove("is-icon-active");
  root.style.setProperty("--pageIcon", "");
}

// Page changed
const routeChangedCallback = () => {
  console.info(`#${pluginId}: page route changed`);
  // Content reloaded, so need reconnect props listeners
  propsChangedObserverStop();
  setTimeout(() => {
    propsChangedObserverRun();
    // Rerender banner
    render();
  }, timeout)
}

// Setting changed
const onSettingsChangedCallback = () => {
  readPluginSettings();
  render();
 }

// On Logseq ready - MAIN
const main = async () => {
  console.info(`#${pluginId}: MAIN`);
  logseq.useSettingsSchema(settingsArray);
  root = top!.document.documentElement;
  body = top!.document.body;

  readPluginSettings();
  initStyles();
    setTimeout(() => {
    render();
  }, timeout*2)

  // Listeners late run
  propsChangedObserverInit();
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();

    // Listen for pages switch
    logseq.App.onRouteChanged(async () => {
      routeChangedCallback();
    })

    // Listen settings update
    logseq.onSettingsChanged(() => {
      onSettingsChangedCallback();
    })
  }, 4000);

}

logseq.ready(main).catch(console.error);
