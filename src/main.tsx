import "@logseq/libs";
import "virtual:windi.css";

import React from "react";
import * as ReactDOM from "react-dom/client";

import { logseq as PL } from "../package.json";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { getDateForPageWithoutBrackets } from "logseq-dateutils";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);


const pluginId = PL.id;

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "bannerImage",
    title: "Default Banner Image",
    type: "string",
    description: "URL of the default banner image",
    default: "https://wallpaperaccess.com/full/1146672.jpg",
  },
  {
    key: "pageIcon",
    title: "Default Page Icon",
    type: "string",
    description: "Emoji of the default page icon",
    default: "📆",
  }
]
function main() {
  logseq.provideStyle(`
    #main-content-container {
      flex-wrap: wrap;
    }
    .cp__sidebar-main-content {
      display: flex;
      flex-direction: column;
    }
    .cp__sidebar-main-content > div {
      transform: translateY(-30px);
      margin-left: 0;
      margin-right: 0;
    }
  `)
  console.info(`#${pluginId}: MAIN`);
  addImage(true)
  logseq.useSettingsSchema(settingsArray)

  logseq.App.onRouteChanged((e) => {

    if (e.path === "/") {
      addImage(true)
    }
    else if (e.path.includes("/page")) {
      addImage()
    }
    else {
      top?.document.getElementById("bannerImage")?.remove()
    }
    // }
  })

  async function addImage(dailyNote = false) {
    setTimeout(async () => {
      const graphPath = (await logseq.App.getCurrentGraph())?.path

      top?.document.getElementById("bannerImage")?.remove()
      //@ts-expect-error
      let bannerLink = dailyNote ? (await logseq.Editor.getPage(getDateForPageWithoutBrackets(new Date, (await logseq.App.getUserConfigs()).preferredDateFormat)))?.properties?.banner : (await logseq.Editor.getCurrentPage())?.properties?.banner;
      // if local image from assets folder
      if (bannerLink && bannerLink.startsWith("../")) {
        bannerLink = "file://" + graphPath + bannerLink.replace("..", "")
      }
      //@ts-expect-error
      const icon = dailyNote ? (await logseq.Editor.getPage(getDateForPageWithoutBrackets(new Date, (await logseq.App.getUserConfigs()).preferredDateFormat)))?.properties?.pageIcon :(await logseq.Editor.getCurrentPage())?.properties?.pageIcon;
      const contentContainer = top?.document.getElementsByClassName("cp__sidebar-main-content")[0]
      console.log(`#${pluginId}: bannerLink - ${bannerLink}`)
      if (top?.document.getElementById("bannerImage") == null) {
        let pageTitle = top?.document.getElementsByClassName("page-title")[0]
        //if page title is null then get element by class name of journal-title
        if (pageTitle == null) {
          pageTitle = top?.document.getElementsByClassName("journal-title")[0]
        }
        // @ts-expect-error
        const bannerImage = top.document.createElement("img")
        bannerImage.id = "bannerImage"
        //remove surrounding quotations if present
        console.log(`#${pluginId}: bannerLink - ${bannerLink}`)
        bannerImage.src = (bannerLink
          ?? (logseq.settings?.bannerImage == "" ? "https://wallpaperaccess.com/full/1146672.jpg": logseq.settings!.bannerImage))
          .replace(/^"(.*)"$/, '$1');
        bannerImage.style.flexBasis = "100%"
        bannerImage.style.maxHeight = "300px"
        bannerImage.style.objectFit = "cover"
        bannerImage.style.margin = "0"
        //@ts-expect-error
        contentContainer.insertBefore(bannerImage, contentContainer?.firstChild)

        // @ts-expect-error
        const iconImage = top.document.createElement("label")


        iconImage.innerText = icon ?? logseq.settings?.pageIcon
        iconImage.id = "helloIcon"
        iconImage.style.fontSize = "50px"
        iconImage.style.flexBasis = "100%"
        iconImage.style.transform = "translate(100px, -30px)"

        if (top?.document.getElementById("helloIcon") == null) {
          // @ts-expect-error
          pageTitle?.parentNode.insertBefore(iconImage, pageTitle)
        }
        // iconImage.src = "https://img.freepik.com/free-vector/winter-landscape-mountains-mid-century-modern-minimalist-art-print-abstract-mountain-contemporary-aesthetic-backgrounds-landscapes-vector-illustrations_69626-620.jpg"

      }
    }, 100)
  }
}

logseq.ready(main).catch(console.error);
