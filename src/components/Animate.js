import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;
import {AttributeList, AttributeRow} from "../UI/AttributeList.js"

function Animate(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);

    const requestId = React.useRef();
    React.useEffect(() => {
        const animate = (timestamp) => {
            // Animation code goes here
            // console.log("animate")
            // entityStore.updateComponent("pointer", "transform", {
            //     rotate: entityStore.getSnapshot()["pointer"].transform.rotate+0.05
            // });
            requestId.current = requestAnimationFrame(animate);
        };
        requestId.current = requestAnimationFrame(animate);
        return () => {
            console.log("canvel animation frame")
            cancelAnimationFrame(requestId.current);
        };
    }, []);

    return h("div", props,
        h("h1", null, "Animate"),
            h(AttributeList, null, 
                h(AttributeRow, null,
                    h("label", {}, "animation"), 
                    h("textarea", {style: {width: "100%"}})
                )
            )
    );
}
export default Animate;
