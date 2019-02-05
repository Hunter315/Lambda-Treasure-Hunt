import React from "react";
import DisplayContainer from "./DisplayContainer";
import myToken from "../tokens/secretTokens";
import axios from "axios";
import styled from "styled-components";
import { isNull } from 'util';

const Button = styled.button`

border-radius: 5px;
  padding: 15px 25px;
  font-size: 22px;
  text-decoration: none;
  margin: 20px;
  color: #fff;
  position: relative;
  display: inline-block;
  }
  
  ${Button}:hover & {
    background-color: #6FC6FF;
  }
`;

const myUrl = process.env.BASE_URL;
// My personal token is config
const config = {
  headers: { Authorization: myToken }
};
export default class Traversal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // initialize state of room, items, directions, player, etc
      coordinates: {},
      exits: [],
      room_id: 0,
      title: "",
      reverseDirection: { n: 's', s: 'n', w: 'e', e: 'w' },
      description: "",
      messages: [],
      cooldown: 0,
      errors: [],
      roomData: {},
      graph: {},
      path: [],
      items: [],
      value: null
    };
  }
  //====================== TRAVERSAL FUNCTIONS ======================
  componentDidMount() {
    if(localStorage.hasOwnProperty('graph')){
      let value = JSON.parse(localStorage.getItem('graph'));
      this.setState({ graph: value})
    }
  
  }
  //----- INITIALIZE GRAPH -----


  //----- Travel -----
  travel = async move => {
    try {
      const response = await axios({
        method: "post",
        url: "https://lambda-treasure-hunt.herokuapp.com/api/adv/move/",
        headers: {
          Authorization: myToken
        },
        data: {
          direction: move,
          next_room_id: this.state.value
        }
      });
      let prev_room_id = this.state.room_id;
      let graph = this.updateGraph(
        response.data.room_id,
        this.parseCoordinates(response.data.coordinates),
        response.data.exits,
        prev_room_id,
        move
      )
      //set the state with my response
      this.setState({
        room_id: response.data.room_id,
        coordinates: this.parseCoordinates(response.data.coordinates),
        exits: [...response.data.exits],
        path: [...this.state.path, move],
        cooldown: response.data.cooldown,
        description: response.data.description,
        items: response.data.items, 
        title: response.data.title,
        players: response.data.players,
        messages: response.data.messages,
        graph
      })
      console.log(response.data)
    } catch (err) {
      console.log(err);
    }
  };

  updateGraph = (id, coordinates, exits, prev_room_id = null, move = null) => {
    const { reverseDirection } = this.state;
    let graph = Object.assign({}, this.state.graph);
    if(!this.state.graph[id]){
      let payload = [];
      payload.push(coordinates);
      const moves = {};
      exits.forEach(exit => {
        moves[exit] = '?';
      });
      payload.push(moves);
      graph = {...graph, [id]: payload };
    }
    if (prev_room_id && move) {
      graph[prev_room_id][1][move] = id;
      graph[id][1][reverseDirection[move]] = prev_room_id;
    }
    localStorage.setItem('graph', JSON.stringify(graph));
    return graph;
  }
  
  //---trying other method---
  traverseMap = () => {
    let unknownExits = this.getUnknownExits();
    if(unknownExits.length) {
      let move = unknownExits[0];
      this.travel(move)
    }

    
  }
  getUnknownExits = () => {
    let unknownExits = [];
    let directions = this.state.graph[this.state.room_id][1];
    for(let direction in directions) {
      if (directions[direction] === '?') {
        unknownExits.push(direction)
      }
    }
    return unknownExits;
  }
  parseCoordinates = coordinates => {
    const coordsObject = {};
    const coordsArray = coordinates.replace(/[{()}]/g, '').split(',');

    coordsArray.forEach(coord => {
      coordsObject['x'] = parseInt[coordsArray[0]];
      coordsObject['y'] = parseInt[coordsArray[1]];

    });
    return coordsObject;
  };

  // need an arrow function to bind properly
  // getInfo is my button to for init command, so I dont spam the server
  getInfo = () => {
    axios
      .get("https://lambda-treasure-hunt.herokuapp.com/api/adv/init", config)
      .then(res => {
        let graph = this.updateGraph(res.data.room_id, this.parseCoordinates(res.data.coordinates), res.data.exits)
        if (res.status === 200 && res.data) {
          console.log(res);
          this.setState({
            coordinates: res.data.coordinates,
            exits: [...res.data.exits],
            room_id: res.data.room_id,
            title: res.data.title,
            description: res.data.description,
            messages: res.data.messages,
            cooldown: res.data.cooldown,
            errors: res.data.errors,
            roomData: res.data,
            graph
          });
        }
      })
      .catch(err => {
        console.log(err);
      });
  };
  getItem = async () => {
    let {treasure} = this.state.items
    
      try {
        await axios({
          method: "post",
          url: "https://lambda-treasure-hunt.herokuapp.com/api/adv/take/",
          headers: {
            Authorization: myToken
          },
          data: {
            name: treasure
          }
        });
    } catch (err){
      console.log(err)
    
    } 
  }
  handleChange = (event) => {
    this.setState({value: event.target.value});
  }
  render() {
    return (
      <React.Fragment>
        <DisplayContainer {...this.state} />
        {/* put this getInfo function into diaplsyContainer */}
        <Button onClick={() => this.getInfo()}>Update Info</Button>
        <Button onClick={() => this.travel('n')}>North</Button>
        <Button onClick={() => this.travel('e')}>East</Button>
        <Button onClick={() => this.travel('s')}>South</Button>
        <Button onClick={() => this.travel('w')}>West</Button>
        <Button onClick={() => this.traverseMap()}>AutoTraverse</Button>
        <Button onClick={() => this.getItem()}>Pick Up Treasure</Button>

        <form>
        <label>
          Next Room ID: 
          <input type="Number" value={this.state.value} onChange={this.handleChange} />
        </label>
      </form>

        
      </React.Fragment>
    );
  }
}
