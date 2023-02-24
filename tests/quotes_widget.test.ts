import 'global-jsdom/register'

import register from 'ignore-styles'
register(['.css'])

import { equal } from "node:assert/strict"
import { describe, it, beforeEach } from "node:test"

import { App, cleanQuote, readPluginSettings, widgetsQuoteCleanupRegExps } from "../src/banners"


// @logseq/libs mock
function initLogseq(settingsOverride) {
  if (!settingsOverride)
    settingsOverride = {}

  const logseq = {
    settings: {
      widgetsQuoteTag: "#quote-test",
    },
    ready: (origMain) => {
      readPluginSettings()
      return {catch: (f) => {}}
    },
  }
  Object.assign(logseq.settings, settingsOverride)

  global.logseq = logseq
  App(logseq)
}


function disableQuoteCleanup() {
  return (func) => {
    const orig = widgetsQuoteCleanupRegExps.splice(0)
    func()
    widgetsQuoteCleanupRegExps.push(...orig)
  }
}


describe('Cleaning quote rules', () => {
  beforeEach(() => {
    initLogseq()
  })

  it('should erase quote tag', () => {
    // disable all cleanup rules, so cleans only qoute tag
    disableQuoteCleanup() (() => {
      equal(cleanQuote("text #quote-test word"), "text  word")
      equal(cleanQuote("text #quote"), "text #quote")
    })
  })

  it('should trim the qoute', () => {
    // disable all cleanup rules, so cleans only qoute tag
    disableQuoteCleanup() (() => {
      equal(cleanQuote("text #quote-test "), "text")
    })
  })

  it('should erase at the border of word', () => {
    // disable all cleanup rules, so cleans only qoute tag
    disableQuoteCleanup() (() => {
      equal(cleanQuote("text #quote-testword"), "text #quote-testword")
    })
  })

  it('should use tag setting', () => {
    // disable all cleanup rules, so cleans only qoute tag
    disableQuoteCleanup() (() => {
      equal(cleanQuote("text #test"), "text #test")

      initLogseq({widgetsQuoteTag: "#test"})
      equal(cleanQuote("text #test"), "text")
    })
  })

  it('should keep line breaks', () => {
    equal(cleanQuote("text\nword"), "text<br/>word")
  })

  it('should translate bold markdown syntax to html', () => {
    equal(cleanQuote("text **word**"), "text <b>word</b>")
    equal(cleanQuote("text __word__"), "text <b>word</b>")
  })

  it('should translate italic markdown syntax to html', () => {
    equal(cleanQuote("text *word*"), "text <i>word</i>")
    equal(cleanQuote("text _word_"), "text <i>word</i>")
  })

  it('should translate strikethrough markdown syntax to html', () => {
    equal(cleanQuote("text ~~word~~"), "text <s>word</s>")
    equal(cleanQuote("text ~word~"), "text ~word~")
  })

  it('should translate strikethrough markdown syntax to html', () => {
    equal(cleanQuote("text `word`"), "text <code>word</code>")
    equal(cleanQuote("text `word"), "text `word")
  })

  it('should erase highlight markdown syntax', () => {
    equal(cleanQuote("text ^^word^^"), "text <mark>word</mark>")
    equal(cleanQuote("text ==word=="), "text <mark>word</mark>")
    equal(cleanQuote("text ==word="), "text ==word=")
    equal(cleanQuote("text =word=="), "text =word==")
  })

  it('should erase markdown links', () => {
    equal(cleanQuote("text [word](http://site.link) test"), "text word test")
    equal(cleanQuote("text[word](http://site.link)test"), "textwordtest")
  })

  it('should erase markdown images', () => {
    equal(cleanQuote("text ![word](http://site.link) test"), "text  test")
    equal(cleanQuote("text![word](http://site.link)test"), "texttest")
  })

  it('should erase custom tags', () => {
    equal(cleanQuote("#text #word"), "")
    equal(cleanQuote("some #te--#xt #wo.rD other"), "some other")
  })

  it('should erase custom tags with brackets', () => {
    equal(cleanQuote("#[[text word]]"), "")
    equal(cleanQuote("some #[[ text word ]]   other"), "some other")
  })

  it('should erase all properties', () => {
    equal(
      cleanQuote(
        `text
        id:: uuid
        template:: prop
        hello/page:: hierarchy`
      ),
      "text"
    )
    equal(
      cleanQuote("text\nid:: uuid\ntemplate:: prop\nhello/page:: hierarchy\nword"),
      "text<br/>word"
    )
    equal(cleanQuote(`id page:: uuid`), "id page:: uuid")
  })

  it('should erase task scheduling', () => {
    equal(cleanQuote(`history\nSCHEDULED: <2014-04-06 Thu 12:00 ++1d>`), "history")
    equal(cleanQuote(`point\nDEADLINE:  <2022-02-24 Thu 5:00>`), "point")
    equal(cleanQuote(`tragedy\n:LOGBOOK:\n* State "NOW" from "LATER" [00:39]\n:END:`), "tragedy")
  })

  it('should erase internal links` brackets', () => {
    equal(cleanQuote("text [[word  link]] end"), "text word  link end")
    equal(cleanQuote("text [[word  link]]end"), "text word  linkend")
  })
})
