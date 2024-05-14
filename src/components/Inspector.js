import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;
import Settings from "./Settings.js";
function Inspector(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const selection = Object.entries(scene).filter(([key, entity])=>{
        return entity.selected ? true : false;
    });
    return h("div", props,
        h("header", null, "INSPECTOR"),
        selection.length>0?null:h("header", null, 
            h(Settings)
        )
    );
}
export default Inspector;
