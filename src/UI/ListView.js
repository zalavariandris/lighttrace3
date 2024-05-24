import React from "react"
const h = React.createElement
function ListView({...props}){
    return h("ul", {...props, className: "list-group"},
        ...props.children
    )
}

/*
    NSListView like widget
    should allow to create sections. group names, and hiearchies...
    for now this is only used for the outliner
*/
function ListItem({active, ...props})
{
    const IsClickable = props.hasOwnProperty("onClick") || props.hasOwnProperty("onMouseDown") || props.hasOwnProperty("onMouseRelease");
    
    let className = "list-group-item";
    if(IsClickable) className+=" list-group-item-action"
    if(active) className += " active";
    
    return h("li", {
        className,
        ...props
    }, ...props.children)
}

function Section({...props}){

}

export default ListView;
export {ListItem}