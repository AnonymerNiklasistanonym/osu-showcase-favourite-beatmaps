import escapeStringRegexp from "escape-string-regexp"
import sgoasbf from "simple-generic-object-array-search-bar-filter"
import * as queryString from "query-string"
import type { FavoriteBeatmapsData } from "../src"

import { autocompleteTextInput } from "./src/autocompleteTextInput"
import { createBeatmapList } from "./src/createBeatmapList"
import { elementFilter } from "./src/filterBeatmap"

try {
    const response = await fetch("./favorite_beatmaps.json")
    if (!response.ok) {
        throw `File (${response.url}) could not be fetched (${response.status}=${response.statusText})`
    }
    const jsonData = (await response.json()) as FavoriteBeatmapsData
    console.log(jsonData)

    const beatmapList = document.getElementById("beatmap-list")
    const beatmapListElement = createBeatmapList(jsonData.favoriteBeatmaps)
    beatmapList.removeChild(beatmapList.querySelector("div.loading"))
    beatmapList.appendChild(beatmapListElement)
    const filterList = (filter?: string) => {
        const parsedFilter = sgoasbf.parseFilter(filter)
        console.log(parsedFilter)
        const filteredBeatmaps = jsonData.favoriteBeatmaps.filter(
            (beatmap) =>
                sgoasbf.filterElement(beatmap, elementFilter, parsedFilter, {
                    debug: true,
                }).match,
        )
        const beatmapListList = document.getElementById("beatmap-list-list")
        for (const childNode of beatmapListList.childNodes) {
            const element = childNode as HTMLElement
            const elementName = element?.dataset?.name.toLocaleLowerCase()
            if (elementName && childNode.nodeType === Node.ELEMENT_NODE) {
                if (
                    filteredBeatmaps.some(
                        (a) => a.title.toLocaleLowerCase() === elementName,
                    )
                ) {
                    element?.classList.remove("hide")
                    element?.classList.add("show")
                } else {
                    element?.classList.remove("show")
                    element?.classList.add("hide")
                }
            }
        }
    }

    const filterInput = document.getElementById(
        "filter-text-input",
    ) as HTMLInputElement

    const parsedQueryArgs = queryString.parse(location.search)
    if (typeof parsedQueryArgs.q === "string") {
        filterInput.value = parsedQueryArgs.q
    }

    filterList(filterInput.value)
    for (const eventName of [
        "keyup",
        "input",
        "propertychange",
        "paste",
        "change",
    ]) {
        filterInput.addEventListener(eventName, () => {
            const stringifiedQueryArgs = queryString.stringify({
                q: filterInput.value,
            })
            window.history.replaceState(null, null, `?${stringifiedQueryArgs}`)
            filterList(filterInput.value)
        })
    }

    autocompleteTextInput(
        filterInput,
        [
            ...new Set(
                jsonData.favoriteBeatmaps
                    .reduce((keywords, beatmap) => {
                        return keywords.concat(
                            elementFilter(beatmap).reduce(
                                (_keywords, _beatmap) => {
                                    if (_beatmap.propertyName) {
                                        _keywords.push(
                                            `${_beatmap.propertyName}=`,
                                        )
                                        if (
                                            _beatmap.type === "number" ||
                                            _beatmap.type === "number-array" ||
                                            ((_beatmap.type === "string" ||
                                                _beatmap.type ===
                                                    "string-array") &&
                                                _beatmap.stringValueToNumberValueMapper !==
                                                    undefined)
                                        ) {
                                            _keywords.push(
                                                `${_beatmap.propertyName}>=`,
                                            )
                                            _keywords.push(
                                                `${_beatmap.propertyName}<=`,
                                            )
                                            _keywords.push(
                                                `${_beatmap.propertyName}>`,
                                            )
                                            _keywords.push(
                                                `${_beatmap.propertyName}<`,
                                            )
                                            _keywords.push(
                                                `${_beatmap.propertyName}<=>`,
                                            )
                                        }
                                    }
                                    if (_beatmap.stringValue) {
                                        _keywords.push(
                                            _beatmap.stringValue.replace(
                                                / /g,
                                                "+",
                                            ),
                                        )
                                        _keywords.push(
                                            ..._beatmap.stringValue.split(/ /g),
                                        )
                                    }
                                    if (_beatmap.stringArrayValue) {
                                        _keywords.push(
                                            ..._beatmap.stringArrayValue.map(
                                                (a) => a.replace(/ /g, "+"),
                                            ),
                                        )
                                        _keywords.push(
                                            ..._beatmap.stringArrayValue.reduce(
                                                (prev, curr) =>
                                                    prev.concat(
                                                        curr.split(/ /g),
                                                    ),
                                                [],
                                            ),
                                        )
                                    }
                                    // Integrating numbers as auto completion doesn't add any value
                                    //if (_beatmap.numberValue) {
                                    //    _keywords.push(`${_beatmap.numberValue}`)
                                    //}
                                    return _keywords
                                },
                                [] as string[],
                            ),
                        )
                    }, [] as string[])
                    .map((keyword) => keyword.trim().toLowerCase()),
            ),
        ],
        {
            customValueToSearch: (textInput) =>
                textInput.split(/\+| /).slice(-1).pop(),
            customValueToSetAfterClick: (
                textInput,
                searchedValue,
                clickedKeyword,
            ) => {
                return textInput
                    .toLowerCase()
                    .replace(
                        new RegExp(escapeStringRegexp(searchedValue) + "s*$"),
                        clickedKeyword.replace(" ", "+"),
                    )
            },
        },
    )
} catch (err) {
    console.error(err)
}
