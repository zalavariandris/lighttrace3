import React from "react"
import {CButton, CButtonGroup} from "@coreui/react" 
import Icon from "./Icon.js"
const h = React.createElement;

function Button({
    color,
    active,
    icon,
    ...props
}){
    return h("button",{
        className: active ? "button active" : "button",
        ...props
    },
        icon?h(Icon, {icon}):null,
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
