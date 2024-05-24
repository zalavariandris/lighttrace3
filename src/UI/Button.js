import React from "react"
import {CButton, CButtonGroup} from "@coreui/react" 

const h = React.createElement;

function Button({
    color,
    active,
    onMouseDown,
    ...props
}){
    return h("button",{
        className: "button",
        onMouseDown,
    },
        props.children
    )
    return h(CButton, { 
        color: color,
        active,
        onMouseDown,
    },
        props.children
    )
}

export default Button;
