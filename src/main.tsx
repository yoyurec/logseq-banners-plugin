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
    transform: translateY(-30px);
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
    setTimeout(async() => {
      top?.document.getElementById("bannerImage")?.remove()
      //@ts-expect-error
      const bannerLink = dailyNote ? (await logseq.Editor.getPage(getDateForPageWithoutBrackets(new Date, (await logseq.App.getUserConfigs()).preferredDateFormat)))?.properties?.banner :(await logseq.Editor.getCurrentPage())?.properties?.banner;
      //@ts-expect-error
      const icon = dailyNote ? (await logseq.Editor.getPage(getDateForPageWithoutBrackets(new Date, (await logseq.App.getUserConfigs()).preferredDateFormat)))?.properties?.pageIcon :(await logseq.Editor.getCurrentPage())?.properties?.pageIcon;
      const contentContainer = top?.document.getElementsByClassName("cp__sidebar-main-content")[0]
      console.log(bannerLink)
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
        console.log(bannerLink)
        bannerImage.src = (bannerLink
          ?? logseq.settings!.bannerImage ?? "https://wallpaperaccess.com/full/1146672.jpg")
          .replace(/^"(.*)"$/, '$1');
        bannerImage.style.flexBasis = "100%"
        bannerImage.style.maxHeight = "300px"
        bannerImage.style.objectFit = "cover"
        //@ts-expect-error
        top?.document.getElementById("main-content-container")?.insertBefore(bannerImage, contentContainer)

        // @ts-expect-error
        const iconImage = top.document.createElement("label")


        iconImage.innerText = icon ?? logseq.settings?.pageIcon
        iconImage.id = "helloIcon"
        iconImage.style.fontSize = "50px"
        iconImage.style.flexBasis = "100%"
        iconImage.style.transform = "translate(100px, -30px)"

        // @ts-expect-error
        pageTitle.insertBefore(iconImage, pageTitle?.childNodes[0])
        // iconImage.src = "https://img.freepik.com/free-vector/winter-landscape-mountains-mid-century-modern-minimalist-art-print-abstract-mountain-contemporary-aesthetic-backgrounds-landscapes-vector-illustrations_69626-620.jpg"

      }
    }, 100)
  }
}

logseq.ready(main).catch(console.error);
