import React from "react";
const h = React.createElement;
class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        error:null,
        info:null
      };
    }
  
    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { hasError: true };
    }
  
    componentDidCatch(error, info) {
      // Example "componentStack":
      //   in ComponentThatThrows (created by App)
      //   in ErrorBoundary (created by App)
      //   in div (created by App)
      //   in App
      this.setState((state, props)=>{
        console.log("set state from", state)
        return {...state, error: error, info: info};
      })
      console.error(error, info);
    }
  
    render() {
      if (this.state.hasError) {
        // You can render any custom fallback UI
        return h("div", {
          style: {
            display: "flex",
            flexDirection:"column",
            justifyContent: "center",
            alignItems:"center",
            padding: "2rem",
            height: "100%",
            padding: "2rem",
            background: "red", color:"white"
          }
        },
          h("h2", null, `${this.state.error}`),
          h("div", {style: {whiteSpace: "pre-wrap", fontSize:"10px"}}, `${this.state.info ? this.state.info.componentStack : ""}`)
        )
      }
  
      return this.props.children;
    }
  }

  export default ErrorBoundary;