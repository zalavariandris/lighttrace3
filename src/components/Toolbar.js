import React from "react";

import entityStore from "../stores/entity-store.js"
import uiStore from "../stores/ui-store.js";

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
        h("button", {
            className: uiState.activeMouseTool? "" : "active",
            onClick: (e)=>uiStore.setValue("activeMouseTool", null)
        }, 
            h("i", {className: "fa-solid fa-arrow-pointer"})
        ),

        h("button", {
            className: uiState.activeMouseTool == "circle" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "circle")
        }, "circle"),

        h("button", {
            className: uiState.activeMouseTool == "rectangle" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "rectangle")
        }, "rectangle"),

        h("button", {
            className: uiState.activeMouseTool == "line" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "line")
        }, "line"),

        h("button", {
            className: uiState.activeMouseTool == "lens" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "lens")
        }, "lens"),

        h("hr", {className: "vertical"}),

        h("button", {
            className: uiState.activeMouseTool == "pointLight" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "pointLight")
        }, "pointLight"),

        h("button", {
            className: uiState.activeMouseTool == "laser" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "laser")
        }, "laser"),

        h("button", {
            className: uiState.activeMouseTool == "directional" ? "active" : "",
            onClick: (e)=>uiStore.setValue("activeMouseTool", "directional")
        }, "directional"),

        h("hr", {className: "vertical"}),

        h("button", {
            style: {color: "red"},
            onClick: e=>entityStore.removeEntities(Object.entries(entityStore.getSelection()).map( ([key, _])=>key))
        }, "delete"),
        h("button", {
            onClick: (e)=>entityStore.loadDefault()
        }, "load default scene"),
        
    )
}

export default Toolbar;