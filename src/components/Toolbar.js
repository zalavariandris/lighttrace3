import React from "react";

import entityStore from "../stores/entity-store.js"
import uiStore from "../stores/ui-store.js";
import {CButton, CButtonGroup} from "@coreui/react" 

import CIcon from '@coreui/icons-react';
import { cilList, cilShieldAlt } from '@coreui/icons';

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

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool?false:true,
                onClick: (e)=>uiStore.setValue("activeMouseTool", null)
            }, 
                h("i", {className: "cil-cursor"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="circle",
                'v-c-tooltip':"create circle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "circle")
            }, 
                h("i", {className: "cil-circle"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="rectangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
            },
                h("i", {className: "cil-square"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="lens",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "lens")
            },
                h("i", {className: "cil-scrubber"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="triangle",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "triangle")
            },
                h("i", {className: "cil-triangle"}),
            ),
        ),

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="pointLight",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
            },
                h("i", {className: "cil-lightbulb"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="laser",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "laser")
            },
                h("i", {className: "cil-pencil"}),
            ),
            h(CButton, { 
                color: 'primary',
                active: uiState.activeMouseTool=="directional",
                onMouseDown: (e)=>uiStore.setValue("activeMouseTool", "directional")
            },
                h("i", {className: "cil-sun"}),
            ),
        ),  

        h(CButtonGroup, {role:"group", ariaLabel:"Basic example"},
            h(CButton, { 
                color: 'danger',
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
            }, 
                h("i", {className: "cil-trash"}),
            ),
            h(CButton, { 
                color: 'primary',
                onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
            },
                h("i", {className: "cil-reload"}),
            ),
        ),
    )
}

export default Toolbar;