import React from "react"

const h = React.createElement;

function AttributesList({
    ...props
}){
    return h("table", {
        className: "attributesTable"
    },
        props.children
    )
}

function AttributesSection({
    ...props
}){
    return h("tbody", {
        className: "attributesSection"
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

export {AttributesList, AttributesSection, AttributeRow};