import React from "react";
import axios from "axios";
import myToken from "../tokens/secretTokens";
// import graphMap from "./components/graphMap";

export default class DisplayContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // initialize state of room, items, directions, player, etc
      coordinates: "",
      exits: [],
      room_id: "",
      title: "",
      description: "",
      messages: [],
    };
  }

  componentDidMount() {
    let config = {
      headers: { Authorization: myToken }
    };
    axios
      .get("https://lambda-treasure-hunt.herokuapp.com/api/adv/init", config)
      .then(res => {
        if (res.status === 200 && res.data) {
            console.log(res)
          this.setState({
            coordinates: res.data.coordinates,
            exits: res.data.exits,
            room_id: res.data.room_id,
            title: res.data.title,
            description: res.data.description,
            messages: res.data.messages
          });
        }
      })
      .catch(err => {
        console.log(err);
      });
  }
  render() {
    return (
      <div>
        <h1>Coordinates: {this.state.coordinates}</h1>
        <h1>Exits: {this.state.exits}</h1>
        <h1>Room_ID: {this.state.room_id}</h1>
        <h1>Title: {this.state.title}</h1>
        <h1>Description: {this.state.description}</h1>
        <h1>Messages:{this.state.messages.length > 0  ? this.state.messages: " There are no messages"  }</h1>
        
      </div>
    );
  }
}
