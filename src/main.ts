import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

import mainStyles from "./main.css?raw";

type AssetDataList = {
  [prop: string]: AssetData;
}

type AssetData = {
  title?: string;
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

type WidgetsConfig = {
  calendar?: any;
  weather?: any;
  quote?: any;
  custom?: any;
}

const pluginId = PL.id;

let doc: Document;
let root: HTMLElement;
let body: HTMLElement;

let isJournal: boolean;
let isHome: boolean;
let isPage: boolean;

let defaultConfig: AssetDataList;
let customPropsConfig: AssetDataList;
let widgetsConfig: WidgetsConfig;
let oldWidgetsConfig: WidgetsConfig;
let isWidgetsCustomHTMLChanged: boolean;
let isWidgetsWeatherChanged: boolean;
let timeout: number;
let hidePluginProps: boolean;
// let defaultPageBannerAuto: boolean;

const pluginPageProps: Array<string> = ["banner", "banner-align","page-icon", "icon"];

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
// const settingsDefaultPageBanner = "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";
const settingsWidgetsCustomHTML = `
<iframe id="banner-widgets-pomo" src="https://pomofocus.io/app"></iframe>
`;

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "generalHeading",
    title: "General settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "hidePluginProps",
    title: "",
    type: "boolean",
    description: "Hide plugin related page props? (will be shown only on edit)",
    default: "false",
  },
  {
    key: "widgetsCalendarHeading",
    title: "Widgets: calendar",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsCalendarEnabled",
    type: "enum",
    default: "journals",
    title: "Show calendar?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    enumChoices: ["off", "journals", "everywhere"],
    enumPicker: "radio",
  },
  {
    key: "widgetsCalendarWidth",
    title: "Block calendar widget width (in px)",
    type: "string",
    description: "",
    default: "380px",
  },
  {
    key: "widgetsWeatherHeading",
    title: "Widgets: weather",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsWeatherEnabled",
    type: "enum",
    default: "journals",
    title: "Show weather?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    enumChoices: ["off", "journals", "everywhere"],
    enumPicker: "radio",
  },
  {
    key: "widgetsWeatherID",
    title: "Weather ID",
    type: "string",
    description: "",
    default: "7QOWaH4IPGGaAr4puql2",
  },
  {
    key: "widgetsQuoteHeading",
    title: "Widgets: quote",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsQuoteEnabled",
    type: "enum",
    default: "journals",
    title: "Show random #quote?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    enumChoices: ["off", "journals", "everywhere"],
    enumPicker: "radio",
  },
  {
    key: "widgetsQuoteTag",
    title: "Show random quotes with this tag (case sensitive!)",
    type: "string",
    description: "",
    default: "#quote",
  },
  {
    key: "widgetsCustomHeading",
    title: "Widgets: custom",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "widgetsCustomEnabled",
    type: "enum",
    default: "everywhere",
    title: "Show custom?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    enumChoices: ["off", "journals", "everywhere"],
    enumPicker: "radio",
  },
  {
    key: "widgetsCustomHTML",
    title: "",
    type: "string",
    description: "Show custom HTML (iframe for ex.) as widget",
    default: settingsWidgetsCustomHTML,
  },
  {
    key: "journalHeading",
    title: "Journal and home settings",
    //@ts-expect-error
    type: "heading"
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page (set empty to disable)",
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
    title: "Default icon (emoji) for journal and home page (set empty to disable)",
    type: "string",
    description: "",
    default: "📅",
  },
  {
    key: "journalIconWidth",
    title: "Icon width for journal & home page (in px)",
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
    title: "Default banner for common page (set empty to disable)",
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
    title: "Default icon (emoji) for common page (set empty to disable)",
    type: "string",
    description: "",
    default: "📄",
  },
  {
    key: "pageIconWidth",
    title: "Icon width for common page (in px)",
    type: "string",
    description: "",
    default: "40px",
  },
  {
    key: "advancedHeading",
    title: "Advanced settings",
    //@ts-expect-error
    type: "heading"
  },
  // {
  //   key: "defaultPageBannerAuto",
  //   title: "",
  //   type: "boolean",
  //   description: "(experimentral) Autogenerate banner image URL according to the page tile",
  //   default: "false",
  // },
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

const initGlobalCSSVars = () => {
  initWidgetsCSSVars();
}

// Read settings
const readPluginSettings = () => {
  isWidgetsCustomHTMLChanged = false;
  isWidgetsWeatherChanged = false;
  oldWidgetsConfig = widgetsConfig;
  widgetsConfig = {
    calendar: {},
    weather: {},
    quote: {},
    custom: {}
  };
  defaultConfig = {
    page: {},
    journal: {}
  }

  if (logseq.settings) {
    ({
      hidePluginProps,
      // defaultPageBannerAuto,
      widgetsCalendarEnabled: widgetsConfig.calendar.enabled,
      widgetsCalendarWidth: widgetsConfig.calendar.width,
      widgetsWeatherEnabled: widgetsConfig.weather.enabled,
      widgetsWeatherID: widgetsConfig.weather.id,
      widgetsQuoteEnabled: widgetsConfig.quote.enabled,
      widgetsQuoteTag: widgetsConfig.quote.tag,
      widgetsCustomEnabled: widgetsConfig.custom.enabled,
      widgetsCustomHTML: widgetsConfig.custom.HTML,
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
    } = logseq.settings);
  }
  if (oldWidgetsConfig) {
    if (widgetsConfig.custom.HTML !== oldWidgetsConfig.custom.HTML) {
      isWidgetsCustomHTMLChanged = true;
    }
    if (widgetsConfig.weather.id !== oldWidgetsConfig.weather.id) {
      isWidgetsWeatherChanged = true;
    }
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
  // if (defaultConfig.page.banner && !defaultPageBannerAuto && !(defaultConfig.page.banner?.includes("source.unsplash.com"))) {
    defaultConfig.page.banner = await getBase64FromUrl(defaultConfig.page.banner);
  }
  if (defaultConfig.journal.banner && !(defaultConfig.journal.banner?.includes("source.unsplash.com"))) {
    defaultConfig.journal.banner = await getBase64FromUrl(defaultConfig.journal.banner);
  }
}

// Colors
function hexToRGB(h: string): string {
  let r = 0, g = 0, b = 0;
  //@ts-expect-error
  r = "0x" + h[1] + h[2];
  //@ts-expect-error
  g = "0x" + h[3] + h[4];
  //@ts-expect-error
  b = "0x" + h[5] + h[6];
  return +r + "," + +g + "," + +b;
}

// Bg colors magic
const setPrimaryColors = () => {
  const primaryTextcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-text-color').trim();
  root.style.setProperty("--widgetsTextColor", hexToRGB(primaryTextcolor));
  const primaryBgcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-background-color').trim();
  root.style.setProperty("--widgetsBgColor", hexToRGB(primaryBgcolor));

}


// Hide page props
const hidePageProps = () => {
  const propBlockKeys = doc.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      const propKey = propBlockKeys[i].textContent;
      if (propKey) {
        if (pluginPageProps.includes(propKey)) {
          propBlockKeys[i].parentElement!.parentElement!.style.display = hidePluginProps ? "none" : "block" ;
        }
      }
    }
  }
}

// Get page type
const getPageType = () => {
  isPage = false;
  isHome = false;
  const pageType = body.getAttribute("data-page");
  if (pageType === "home") {
    isHome = true;
    isPage = false;
  }
  if (pageType === "page") {
    isPage = true;
    isHome = false;
  }
}

const getPageAssetsData = async (): Promise<AssetData> => {
  let pageAssetsData = { ...defaultConfig.journal };
  let currentPageProps: any = {};
  // home = journal page?
  if (isHome) {
    console.info(`#${pluginId}: Homepage`);
    return pageAssetsData;
  }
  const currentPageData = await getPageData();
  // journal page?
  isJournal = currentPageData["journal?"];
  if (isJournal) {
    console.info(`#${pluginId}: Journal page`);
    return pageAssetsData;
  }
  // common page?
  console.info(`#${pluginId}: Trying page props`);
  currentPageProps = currentPageData.properties;
  if (currentPageProps) {
    // get custom config, override it with high proirity page props
    const customAssetData = getCustomAssetData(currentPageProps);
    pageAssetsData = { ...defaultConfig.page, ...customAssetData, ...currentPageProps }
  } else {
    console.info(`#${pluginId}: Default page`);
    pageAssetsData = { ...defaultConfig.page };
  }
  // Add title
  if (currentPageData.name) {
    pageAssetsData.title = currentPageData.name.split(" ").slice(0,3).join("-").replace(/[\])}[{(]/g, '');
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
const renderImage = async (pageAssetsData: AssetData): Promise<boolean> => {
  if (pageAssetsData.banner) {
    // Set banner CSS variable
    body.classList.add("is-banner-active");
    root.style.setProperty("--bannerHeight", `${pageAssetsData.bannerHeight}`);
    root.style.setProperty("--bannerAlign", `${pageAssetsData.bannerAlign}`);

    //remove surrounding quotations if present
    pageAssetsData.banner = pageAssetsData.banner.replace(/^"(.*)"$/, '$1');
    // experimental auto image
    // if (defaultPageBannerAuto) {
    //   pageAssetsData.banner = `https://source.unsplash.com/1600x900?${pageAssetsData.title}`;
    // }
    // if local image from assets folder
    if (pageAssetsData.banner.startsWith("../")) {
      const graphPath = (await logseq.App.getCurrentGraph())?.path;
      pageAssetsData.banner = encodeURI("assets://" + graphPath + pageAssetsData.banner.replace("..", ""));
    }
    // const bannerImage = await getImagebyURL(pageAssetsData.banner);
    // if (bannerImage) {
    //   pageAssetsData.banner = bannerImage;
    // } else {
    //   pageAssetsData.banner = defaultConfig.page.banner;
    // }
    root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);

    return true;
  } else {
    // clear old banner
    clearBanner();
    return false;
  }
}

// Get image
const getImagebyURL = async (url: string) => {
  let response = await fetch(url)
  if (response.status === 200) {
    if (response.url.includes("source-404")) {
      return "";
    }
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
  }
  else {
    console.info(`#${pluginId}: HTTP-Error: ${response.status}`);
    return "";
  }
}

// Render icon
const renderIcon = async (pageAssetsData: AssetData) => {
  const pageIcon = pageAssetsData.icon || pageAssetsData.pageIcon;
  if (pageIcon) {
    // Set icon CSS variable
    body.classList.add("is-icon-active");
    root.style.setProperty("--iconWidth", `${pageAssetsData.iconWidth}`);
    root.style.setProperty("--pageIcon", `"${pageIcon}"`);
  } else {
    // clear old icon
    clearIcon();
  }
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
  const preBlock = doc.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
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
  initGlobalCSSVars();
  render();
}

// Plugin unloaded
const onPluginUnloadCallback = () => {
  // clean up
  top!.document.getElementById("banner")?.remove();
}

// Color mode changed
const onThemeModeChangedCallback = () => {
  setTimeout(() => {
    setPrimaryColors();
  }, 100)
}

// Render placeholder
const renderPlaceholder = () => {
  // Widgets area
  if (!doc.getElementById("banner")) {
    const container = doc.getElementById("main-content-container");
    if (container) {
      container.setAttribute("style", "display:block;margin-left:auto;margin-right:auto;");
      container.insertAdjacentHTML(
        "afterbegin",
        `<div id="banner" style="position:relative;display:none;">
          <div id="banner-widgets">
            <div id="banner-widgets-calendar"></div>
          </div>
        </div>`
      );
    }
  }
}

// Show placeholder
const showPlaceholder = () => {
  doc.getElementById("banner")!.style.display = "block";
}

// Hide placeholder
const hidePlaceholder = () => {
  doc.getElementById("banner")!.style.display = "none";
}

// Render widgets
const renderWidgets = () => {
  const isWidgetCalendarRendered = renderWidgetCalendar();
  const isWidgetWeatherRendered = renderWidgetWeather();
  if (isWidgetCalendarRendered || isWidgetWeatherRendered) {
    doc.getElementById("banner-widgets")?.classList.add("banner-widgets-bg");
  } else {
    doc.getElementById("banner-widgets")?.classList.remove("banner-widgets-bg");
  }
  renderWidgetQuote();
  renderWidgetsCustom();
}

// Render calendar widget
const renderWidgetCalendar = () => {
  const bannerWidgetsCalendar = doc.getElementById("banner-widgets-calendar");
  if (widgetsConfig.calendar.enabled === "off" || (widgetsConfig.calendar.enabled === "journals" && !(isHome || isJournal))) {
    bannerWidgetsCalendar!.style.display = "none";
    return false;
  }
  bannerWidgetsCalendar!.style.display = "block";
  return true;
}

// Render weather widget
const renderWidgetWeather = () => {
  const bannerWidgetsWeather = doc.getElementById("banner-widgets-weather");
  if (widgetsConfig.weather.enabled === "off" || (widgetsConfig.weather.enabled === "journals" && !(isHome || isJournal))) {
    bannerWidgetsWeather?.remove();
    return false;
  }
  if (!bannerWidgetsWeather || isWidgetsWeatherChanged) {
    bannerWidgetsWeather?.remove();
    doc.getElementById("banner-widgets")?.insertAdjacentHTML("beforeend", `<iframe id="banner-widgets-weather" src="https://indify.co/widgets/live/weather/${widgetsConfig.weather.id}"></iframe>`);
  }
  return true;
}

// Render random quote widget
const renderWidgetQuote = async () => {
  if (widgetsConfig.quote.enabled === "off" || (widgetsConfig.quote.enabled === "journals" && !(isHome || isJournal))) {
    doc.getElementById("banner-widgets-quote")?.remove();
    return;
  }
  const quote = await getRandomQuote();
  if (quote) {
    const bannerWidgetsQuoteText = doc.getElementById("banner-widgets-quote-text");
    if (bannerWidgetsQuoteText) {
      bannerWidgetsQuoteText.textContent = quote;
    } else {
      doc.getElementById("banner-widgets")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-quote"><span id="banner-widgets-quote-text">${quote}</span></div>`);
    }
    root.style.setProperty("--widgetsQuoteFS", getFontSize(quote.length));
  }
}

// Calculate font size to fit block
const getFontSize = (textLength: number): string => {
  if(textLength > 200) {
    return "1.2em"
  }
  if(textLength > 150) {
    return "1.25em"
  }
  return "1.3em"
}

// Get random quote
const getRandomQuote = async () => {
  // [(clojure.string/starts-with? ?c "#+BEGIN_QUOTE")]
  let query = `
    [
      :find (pull ?b [*])
      :where
          [?b :block/content ?c]
          (or
              [(clojure.string/starts-with? ?c "${widgetsConfig.quote.tag} ")]
              [(clojure.string/ends-with? ?c " ${widgetsConfig.quote.tag}")]
          )
    ]
  `;
  let quotesList = await logseq.DB.datascriptQuery(query);
  if (!quotesList.length) {
    return "";
  }
  const randomQuoteBlock = quotesList[Math.floor(Math.random() * quotesList.length)][0];
  const randomQuoteContent: string = randomQuoteBlock.content || "";
  return randomQuoteContent.replace(/>|\*|#quote/gi, "").trim();
}

// Render custom widget
const renderWidgetsCustom = async () => {
  const bannerWidgetsCustom = doc.getElementById("banner-widgets-custom");
  if (widgetsConfig.custom.enabled === "off" || (widgetsConfig.custom.enabled === "journals" && !(isHome || isJournal))) {
    bannerWidgetsCustom?.remove();
    return;
  }
  if (!bannerWidgetsCustom || isWidgetsCustomHTMLChanged) {
    doc.getElementById("banner-widgets")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-custom">${widgetsConfig.custom.HTML}</div>`);
  }
}

const initWidgetsCSSVars = () => {
  setPrimaryColors();
  root.style.setProperty("--widgetsCalendarWidth", widgetsConfig.calendar.width);
}


// Render
const render = async () => {
  getPageType();

  if (!(isHome || isPage)) {
    hidePlaceholder();
    clearBanner();
    clearIcon();
    return;
  }

  hidePageProps();

  renderPlaceholder();

  let pageAssetsData: AssetData | null = null;
  pageAssetsData = await getPageAssetsData();
  if (pageAssetsData) {
    if (!pageAssetsData.banner) {
      hidePlaceholder();
      clearBanner();
      clearIcon();
      return;
    }
    const isBannerRendered = await renderImage(pageAssetsData);
    if (isBannerRendered) {
      renderIcon(pageAssetsData);
      renderWidgets();
      showPlaceholder();
    }
  }
}

// On Logseq ready - MAIN
const main = async () => {
  console.info(`#${pluginId}: MAIN`);

  logseq.useSettingsSchema(settingsArray);
  doc = top!.document;
  root = doc.documentElement;
  body = doc.body;

  body.classList.add("is-banners-plugin-loaded");
  readPluginSettings();
  initStyles();
  initGlobalCSSVars();
  setTimeout(() => {
    render();
  }, timeout*2)

  // Listeners late run
  propsChangedObserverInit();

  // Secondary listeners
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();

    // Listen for pages switch
    logseq.App.onRouteChanged( async () => {
      routeChangedCallback();
    })

    // Listen settings update
    logseq.onSettingsChanged(() => {
      onSettingsChangedCallback();
    })

    // Listen plugin unload
    logseq.beforeunload( async () => {
      onPluginUnloadCallback();
    })

    // Listen for theme mode changed
    logseq.App.onThemeModeChanged( () => {
      onThemeModeChangedCallback();
    })

  }, 4000);

}

logseq.ready(main).catch(console.error);
