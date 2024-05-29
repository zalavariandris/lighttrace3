import React from "react";
import Outliner  from "./components/Outliner.js"
import Inspector from "./components/Inspector.js"
import Viewport  from "./components/Viewport.js"
import Animate from "./components/Animate.js";
import Toolbar from "./components/Toolbar.js";
import entityStore from "./stores/entity-store.js"

import Settings from "./components/Settings.js";
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

    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const selection = Object.fromEntries(Object.entries(scene).filter(([key, entity])=>{
        return entity.selected ? true : false;
    }));

    return h("div", {},
        h(Viewport,  {id: "viewport"}),

        h("div", {id:"leftSidebar", className: "panel"},
            h(Outliner),
        ),

        h("div", {
            id:"rightSidebar", 
            className: "panel",
        },
            Object.keys(selection).length ? h(Inspector) : h(Settings)
        ),

        h("div", {id: "bottombar", className: "panel", style: {background: "transparent"}},
            h(Toolbar)
        )
    );
}

export default App;
