import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;

function Outliner(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    return h("ul", props, 
        Object.entries(scene)
            .map( ([key, entity])=>{
            return h("li", null, 
                `${key}: (${entity.transform.translate.x},${entity.transform.translate.y})`
            )
        })
    );
}
export default Outliner;
