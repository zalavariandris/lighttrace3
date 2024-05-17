import React from "react";
import SVGViewport from "./SVGViewport.js";
import GLViewport from "./GLViewport.js";

const h = React.createElement;

function fitViewboxInSize(viewBox, size)
{
    // adjust viewbox width to match resolution aspect "contain"
    let size_aspect = size.width/size.height;
    let view_aspect = viewBox.w/viewBox.h;
    let newViewBox = viewBox;
    if(size_aspect > view_aspect)
    {
        const new_view_width = viewBox.h * size_aspect;
        newViewBox = {
            x: viewBox.x+(viewBox.w-new_view_width)/2,
            w: new_view_width,
            y: viewBox.y,
            h: viewBox.h
        }
    }
    else
    {
        const new_view_height = viewBox.w / size_aspect;
        newViewBox = {
            x: viewBox.x,
            w: viewBox.w,
            y: viewBox.y+(viewBox.h-new_view_height)/2,
            h: new_view_height
        }
    }

    return newViewBox
}

function Viewport(props)
{
    // sync svg- and glviewport viewbox
    const [viewBox, setViewBox] = React.useState({
        x:0,y:0,w:512,h:512
    });

    const ref = React.useRef(null);

    React.useEffect( ()=>{
        function resizeHandler(e)
        {
            setViewBox( fitViewboxInSize(viewBox, {width: ref.current.clientWidth, height: ref.current.clientHeight}) );
        }
        setViewBox( fitViewboxInSize(viewBox, {width: ref.current.clientWidth, height: ref.current.clientHeight}) );

        window.addEventListener("resize", resizeHandler);

        return ()=>{
            window.removeEventListener("resize", resizeHandler);
        }
    }, []);

    return h("div", {
        ref: ref, 
        ...props
    },
        h(GLViewport, {
            viewBox: viewBox,
            style: {
                position: "absolute", 
                width: "100%", 
                height:"100%",
                pointerEvents: "none",
                transform: "scale(1, -1) translateZ(0)"   
            }
        }),
        h(SVGViewport, {
            viewBox: viewBox,
            preserveAspectRatio: "none",
            onViewBoxChange: viewBox=>setViewBox(viewBox),
            style: {
                position: "absolute", 
                width: "100%", 
                height:"100%",
                transform: "translateZ(0)"   
            }
        })
    )
}

export default Viewport;