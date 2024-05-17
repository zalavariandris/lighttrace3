import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;

function Toolbar({children, ...props}){
    return h("div", {},
        h("button", {}, "select"),
        h("button", {}, "circle"),
        h("button", {}, "rectangle"),
        h("button", {}, "lens"),
        h("button", {}, "pointlight"),
        h("button", {}, "laser"),
        h("button", {}, "directional"),
        h("button", {
            onClick: (e)=>entityStore.loadDefault()
        }, "load default scene")
    )
}

export default Toolbar;