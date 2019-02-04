import React, { Component } from "react";
import graphMap from "./components/graphMap";
import "./App.css";
import axios from "axios";
import myToken from './tokens/secretTokens'


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // save state of room, items, directions, player
    };
  }

  componentDidMount() {
    
    
    let config = {
      headers: { Authorization: myToken }
    };
    axios
      .get("https://lambda-treasure-hunt.herokuapp.com/api/adv/init", config)
      .then(res => { console.log(res) })
      .catch(err => {
        console.log(err)
      });
  }
  render() {
    return (
      <div className="App">
        
      </div>
    );
  }
}

export default App;
