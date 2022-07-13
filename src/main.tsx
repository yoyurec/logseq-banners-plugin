import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc, PageEntity, BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

import mainStyles from "./main.css?raw";

const pluginId = PL.id;

let root: HTMLElement;
let body: HTMLElement;

type AssetDataList = {
  [prop: string]: AssetData;
}

type AssetData = {
  banner?: string;
  bannerHeight?: string;
  bannerAlign?: string;
  pageIcon?: string;
  iconWidth?: string;
  icon?: string;
}

enum AssetType {
  banner = "banner",
  pageIcon = "pageIcon"
}

let pageType: string;
let defaultConfig: AssetDataList;
let customPropsConfig: AssetDataList;
let timeout: number;
let hidePluginProps: boolean;

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsArray: SettingSchemaDesc[] = [
  {
    key: "journalHeading",
    title: "Journal and home settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page",
    type: "string",
    description: "",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "journalBannerHeight",
    title: "Banner height for journal & home page",
    type: "string",
    description: "",
    default: "300px",
  },
  {
    key: "journalBannerAlign",
    title: "Default banner vertical align for journal and home page",
    type: "string",
    description: "",
    default: "50%"
  },
  {
    key: "defaultJournalIcon",
    title: "Default icon (emoji) for journal and home page",
    type: "string",
    description: "",
    default: "📅",
  },
  {
    key: "journalIconWidth",
    title: "Icon height for journal & home page (in px)",
    type: "string",
    description: "",
    default: "50px",
  },
  {
    key: "pageHeading",
    title: "Common page settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "defaultPageBanner",
    title: "Default banner for common page",
    type: "string",
    description: "",
    default: settingsDefaultPageBanner,
  },
  {
    key: "pageBannerHeight",
    title: "Banner height for common page",
    type: "string",
    description: "",
    default: "200px",
  },
  {
    key: "pageBannerAlign",
    title: "Default banner vertical align for common page",
    type: "string",
    description: "",
    default: "50%"
  },
  {
    key: "defaultPageIcon",
    title: "Default icon (emoji) for common page",
    type: "string",
    description: "",
    default: "📄",
  },
  {
    key: "pageIconWidth",
    title: "Icon height for common page (in px)",
    type: "string",
    description: "",
    default: "40px",
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
          "banner": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
        },
        "seed": {
          "pageIcon": "🌱",
          "banner": "https://images.unsplash.com/photo-1631949454967-6c6d07fb59cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
          "bannerHeight": "200px",
          "bannerAlign": "50%"
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
  logseq.provideStyle(mainStyles);
}

// Read settings
const readPluginSettings = () => {
  defaultConfig = {
    page: {},
    journal: {}
  }
  const pluginSettings = logseq.settings;
  if (pluginSettings) {
    ({
      hidePluginProps,
      defaultPageBanner: defaultConfig.page.banner,
      pageBannerHeight: defaultConfig.page.bannerHeight,
      pageBannerAlign: defaultConfig.page.bannerAlign,
      defaultPageIcon: defaultConfig.page.pageIcon,
      pageIconWidth: defaultConfig.page.iconWidth,
      defaultJournalBanner: defaultConfig.journal.banner,
      journalBannerHeight: defaultConfig.journal.bannerHeight,
      journalBannerAlign: defaultConfig.journal.bannerAlign,
      defaultJournalIcon: defaultConfig.journal.pageIcon,
      journalIconWidth: defaultConfig.journal.iconWidth,
      customPropsConfig,
      timeout
    } = pluginSettings);
  }
  encodeDefaultBanners();
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
  pageType = getPageType();
  if (!isPageTypeOk()) {
    clearIcon();
    clearBanner();
    return;
  }
  const pageAssetsData: AssetData = await getPageAssetsData();
  if (pageAssetsData) {
    renderBanner(pageAssetsData);
  }
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

const getPageAssetsData = async (): Promise<AssetData> => {
  let pageAssetsData = defaultConfig.journal;
  let currentPageProps: any = {};
  // home = journal page?
  if (pageType === "home") {
    console.info(`#${pluginId}: Homepage`);
    return pageAssetsData;
  }
  // journal page?
  const currentPageData = await getPageData();
  if (currentPageData["journal?"]) {
    console.info(`#${pluginId}: Journal page`);
    return pageAssetsData;
  }
  // common page?
  console.info(`#${pluginId}: Trying page props`);
  currentPageProps = currentPageData.properties;
  if (currentPageProps) {
    // get custom config, override with high proirity page props
    const customAssetData = getCustomAssetData(currentPageProps);
    pageAssetsData = { ...defaultConfig.page, ...customAssetData, ...currentPageProps }
  } else {
    console.info(`#${pluginId}: Default page`);
    pageAssetsData = defaultConfig.page;
  }
  console.info(`#${pluginId}: pageAssetsData -- `, pageAssetsData);
  return pageAssetsData;
}

const getPageData = async (): Promise<any> => {
  let currentPageData = null;
  currentPageData = await logseq.Editor.getCurrentPage();
  if (currentPageData) {
    // Check if page is a child and get parent ID
   //@ts-expect-error
    const currentPageId = currentPageData.page?.id;
    if (currentPageId) {
      currentPageData = null;
      currentPageData = await logseq.Editor.getPage(currentPageId);
    }
  }
  return currentPageData;
}

// Read custom defaults config
const getCustomAssetData = (currentPageProps: any) => {
  console.info(`#${pluginId}: Trying custom JSON settings`);
  let customAssetData = {};
  for (const key of Object.keys(customPropsConfig)) {
    const pageCustomProp = currentPageProps?.[key];
    if (pageCustomProp) {
      const pageCustomPropValue = Array.isArray(pageCustomProp) ? pageCustomProp[0] : pageCustomProp;
      if (pageCustomPropValue) {
        //@ts-expect-error
        customAssetData = customPropsConfig?.[key]?.[pageCustomPropValue];
      }
    }
  }
  return customAssetData;
}

// Render banner
const renderBanner = async (pageAssetsData: AssetData) => {
  if (pageAssetsData.banner) {
    //remove surrounding quotations if present
    pageAssetsData.banner = pageAssetsData.banner.replace(/^"(.*)"$/, '$1');
    // if local image from assets folder
    if (pageAssetsData.banner.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      pageAssetsData.banner = encodeURI("assets://" + graphPath + pageAssetsData.banner.replace("..", ""));
    }
    // Set banner CSS variable
    body.classList.add("is-banner-active");
    root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);
    root.style.setProperty("--bannerHeight", `${pageAssetsData.bannerHeight}`);
    root.style.setProperty("--bannerAlign", `${pageAssetsData.bannerAlign}`);

    // render icon only if banner exists
    renderIcon(pageAssetsData);
  } else {
    clearBanner();
  }
}

// render icon
const renderIcon = async (pageAssetsData: AssetData) => {
  const pageIcon = pageAssetsData.icon || pageAssetsData.pageIcon;
  if (pageIcon) {
    // Set icon CSS variable
    body.classList.add("is-icon-active");
    root.style.setProperty("--iconWidth", `${pageAssetsData.iconWidth}`);
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
      if (mutationsList[i]?.target?.offsetParent?.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
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
  root.style.setProperty("--bannerHeight", "");
  root.style.setProperty("--bannerAlign", "");
}

// Hide icon element
const clearIcon = () => {
  body.classList.remove("is-icon-active");
  root.style.setProperty("--pageIcon", "");
  root.style.setProperty("--iconWidth", "");
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
