import React from "react";

import entityStore from "../stores/entity-store.js"
import uiStore from "../stores/ui-store.js";
import {CButton, CButtonGroup} from "@coreui/react" 
import Icon from "../UI/Icon.js"

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
                h(CButton, { 
                    tooltip: "select and move tool",
                    color: 'primary',
                    active: uiState.activeMouseTool?false:true,
                    onClick: (e)=>uiStore.setValue("activeMouseTool", null)
                }, 
                    h("i", {className: "cil-cursor"}),
                ),
        ),
        h(CButtonGroup, {role:"group"},
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="circle",
                'v-c-tooltip':"create circle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
            }, 
                h(Icon, {icon: "circle"}),
            ),

            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="rectangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
            },
                h(Icon, {icon: "square"})
            ),

            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="triangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
            },
                h(Icon, {icon: "triangle"})
            ),

            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="lens",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
            },
                h(Icon, {icon: "lens"})
            ),

            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="line",
                label:"create line",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "line")
            }, 
                h(Icon, {icon: "line"})
            )
        ),

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="pointLight",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
            },
                h(Icon, {icon: "lightbulb"})
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="laser",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
            },
                h(Icon, {icon: "laser"})
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="directional",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
            },
                h(Icon, {icon: "sun"})
            ),
        ),  

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(CButton, { 
                color: 'primary',
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
            },
                h(Icon, {icon: "restore"})
            ),
            h(CButton, { 
                color: 'danger',
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
            }, 
                h(Icon, {icon: "trash"})
            )
        ),
    )
}

export default Toolbar;