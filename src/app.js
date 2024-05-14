import React from "react";
import Outliner  from "./components/Outliner.js"
import Inspector from "./components/Inspector.js"
import Viewport  from "./components/Viewport.js"


const h = React.createElement;

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
