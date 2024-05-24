import React from "react"

const h = React.createElement;

function AttributeList({
    ...props
}){
    return h("div", {
        className: "attributeList"
    },
        props.children
    )
}

function AttributeSection({
    ...props
}){
    return h("div", {
        className: "attributeSection"
    },
        props.children
    );
}

function AttributeHeaderRow({
    ...props
}){
    return h("div", {
        className: "attributeHeaderRow"
    },
        h("div", {}, h("h2", null, props.children))
    )
}

function AttributeRow({
    ...props
})
{
    return h("div", {
        className: "attributeRow"
    },
        props.children
    )
}

export {AttributeList, AttributeSection, AttributeRow, AttributeHeaderRow};