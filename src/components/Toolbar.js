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
                'v-c-tooltip':"create circle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
            }, 
                h(Icon, {icon: "circle"}),
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="rectangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
            },
                h(Icon, {icon: "square"})
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="triangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
            },
                h(Icon, {icon: "triangle"})
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="lens",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
            },
                h(Icon, {icon: "lens"})
            ),

            h(Button, { 
                active: uiState.activeMouseTool=="line",
                label:"create line",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "line")
            }, 

                h(Icon, {icon: "line"})
            )
        ),

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(Button, { 
                active: uiState.activeMouseTool=="pointLight",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
            },
                h(Icon, {icon: "lightbulb"})
            ),
            h(Button, { 
                active: uiState.activeMouseTool=="laser",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
            },
                h(Icon, {icon: "laser"})
            ),
            h(Button, { 
                active: uiState.activeMouseTool=="directional",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
            },
                h(Icon, {icon: "sun"})
            ),
        ),  

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(Button, { 
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
            },
                h(Icon, {icon: "restore"})
            ),
            h(Button, { 
                color: 'danger',
                onClick: e=>{
                    console.log("trash")
                    entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key));
                }
            }, 
                h(Icon, {icon: "trash"})
            )
        ),
    )
}

export default Toolbar;