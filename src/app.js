import React from "react";
import Outliner from "./components/Outliner.js"
import Inspector from "./components/Inspector.js"
import SVGViewport from "./components/SVGViewport.js";
import GLViewport from "./components/GLViewport.js";

const h = React.createElement;

function Viewport(props){
    return h("div", props,
        h(GLViewport, {
            style: {
                position: "absolute", 
                width: "100%", 
                height:"100%",
                pointerEvents: "none",
                transform: "scale(1, -1)"
            }
        }),
        h(SVGViewport, {
            style: {
                position: "absolute", 
                width: "100%", 
                height:"100%"
            }
        })
    )
}

function App({})
{
    // function handleChange(e)
    // {
    //     if(e.key === 'Enter')
    //     {
    //         sceneStore.addEntity(e.target.value, {shape: {type: "rectangle", size: 10.0}});
    //         e.target.value = ""
    //     }
    // }

    // const scene = React.useSyncExternalStore(sceneStore.subscribe, sceneStore.getSnapshot);

    return h("div", {},
        h(Viewport,  {id: "viewport"}),
        h(Outliner,  {id: "outliner",  className: "panel"}),
        h(Inspector, {id: "inspector", className: "panel"}),
        
        // h("div", {
        //     className: "viewports", 
        //     style: {

        //     }
        // },
        //     h(GLViewport, {width: 512, height: 512}),
        //     h(SVGViewport, {width: 512, height: 512})
        // )
    );
}

export default App;
