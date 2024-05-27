import React from "react";

import entityStore from "../stores/entity-store.js"
import uiStore from "../stores/ui-store.js";
import {CButton, CButtonGroup} from "@coreui/react" 
import Icon from "../UI/Icon.js"
import Button from "../UI/Button.js"

const h = React.createElement;


function Toolbar({children, ...props}){
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);

    return h("div", {
        style:{
            // textAlign: "center",
            display: "flex",
            alignItems: "center"
        }
    },

        h(CButtonGroup, {role:"group"},
                h(Button, { 
                    tooltip: "select and move tool",
                    active: uiState.activeMouseTool?false:true,
                    onClick: (e)=>uiStore.setValue("activeMouseTool", null)
                }, 
                    h(Icon, {icon: "cursor"}),
                    "select"
                ),
        ),
        h(CButtonGroup, {role:"group"},
            h(Button, {
                active: uiState.activeMouseTool=="circle",
                icon: "circle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
            }, 
                h("span", null, "circle")
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="rectangle",
                icon: "square",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
            },
                "rectangle"
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="triangle",
                icon: "triangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
            },
                "triangle"
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="lens",
                icon: "lens",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
            },
                "lens"
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="line",
                icon: "line",
                label:"create line",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "line")
            },
                "line"
            )
        ),

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(Button, { 
                active: uiState.activeMouseTool=="pointLight",
                icon: "lightbulb",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
            },
                "pointlight"
            ),
            h(Button, { 
                active: uiState.activeMouseTool=="laser",
                icon: "laser",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
            },
                "laser"
            ),
            h(Button, { 
                active: uiState.activeMouseTool=="directional",
                icon: "sun",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
            },
                "directional"
            ),
        ),  

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(Button, { 
                icon: "restore",
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
                
            },
                "restore"
            ),
            h(Button, { 
                color: 'danger',
                icon: "trash",
                onClick: e=>{
                    console.log("trash")
                    entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                }
            }, 
                "trash"
            )
        ),
    )
}

export default Toolbar;