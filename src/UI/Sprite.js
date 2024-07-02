import React from "react";
const h = React.createElement;

function Sprite({cx, cy, children}){
    const ref = React.useRef(null);
    const zoom = React.useRef(1.0);

    React.useEffect(()=>{
        if(ref.current){
            const svg = ref.current.closest("SVG");
            if (svg==null) {
                return;
            }
            const [left, top, width, height] = svg.getAttribute("viewBox").split(" ").map(str=>parseFloat(str));
            zoom.current = svg.clientWidth/width;
        }
    });


    return h("g", {
        ref,
        style:{
            transform: `scale(${1/zoom.current}) translate(${cx}px, ${cy}px)`,
            transformOrigin: `${cx}px ${cy}px`
        }
    }, children);
}

export default Sprite;