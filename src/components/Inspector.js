import entityStore from "../entity-store.js"
import React from "react";
const h = React.createElement;

function Inspector(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    return h("div", props,
        "INSPECTOR"
    );
}
export default Inspector;
