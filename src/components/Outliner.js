import entityStore from "../entity-store.js"
import React from "react";
const h = React.createElement;

function Outliner(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    return h("ul", props, 
        Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("pos"))
            .map( ([key, entity])=>{
            return h("li", null, 
                `${key}: (${entity.pos.x},${entity.pos.y})`
            )
        })
    );
}
export default Outliner;
