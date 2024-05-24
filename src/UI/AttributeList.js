import React from "react"

const h = React.createElement;

function AttributeList({
    ...props
}){
    return h("table", {
        className: "attributesTable"
    },
        props.children
    )
}

function AttributeSection({
    ...props
}){
    return h("tbody", {
        className: "AttributeSection"
    },
        props.children
    );
}

function AttributeRow({
    ...props
})
{
    return h("tr", {
        className: "attributeRow"
    },
        props.children
    )
}

export {AttributeList, AttributeSection, AttributeRow};