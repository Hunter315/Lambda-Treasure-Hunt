import React from "react";
// import axios from "axios";
// import myToken from "../tokens/secretTokens";
// import GraphMap from "./components/graphMap";

export default class DisplayContainer extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <h1>Coordinates: {this.props.roomData.coordinates}</h1>
        <h1>Exits: {this.props.exits}</h1>
        <h1>Room_ID: {this.props.room_id}</h1>
        <h1>Title: {this.props.title}</h1>
        <h1>Description: {this.props.description}</h1>
        <h1>Cooldown: {this.props.cooldown}</h1>
        <h1>Items: {this.props.items}</h1>
        <h1>Players: {this.props.roomData.players}</h1>
        <h1>
          Messages:
          {this.props.messages.length > 0
            ? this.props.messages
            : " There are no messages."}
        </h1>
        
      </React.Fragment>
    );
  }
}
