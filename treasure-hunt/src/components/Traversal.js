import React from "react";
import DisplayContainer from "./DisplayContainer";
import myToken from "../tokens/secretTokens";
import axios from "axios";
import styled from "styled-components";
import GraphMap from "./GraphMap";
import data from './data.json'
// My personal token is config
const config = {
  headers: { Authorization: myToken }
};
export default class Traversal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // initialize state of room, items, directions, player, etc
      allCoordinates: [],
      allLinks: [],
      mapCoords: [],
      exits: [],
      room_id: 0,
      title: "",
      reverseDirection: { n: "s", s: "n", w: "e", e: "w" },
      description: "",
      messages: [],
      cooldown: 15,
      errors: [],
      roomData: {},
      graph: {},
      path: [],
      items: [],
      value: "",
      visited: new Set(),
      countVisited: 0,
      graphLoaded: false,
    };
  }
  //====================== TRAVERSAL FUNCTIONS ======================
  componentDidMount() {
  
    if (localStorage.hasOwnProperty("graph")) {
      let value = JSON.parse(localStorage.getItem("graph"));
      this.setState({ graph: value, graphLoaded: true });
    } else {
      localStorage.setItem('graph', JSON.stringify(data));
      let value = JSON.parse(localStorage.getItem('graph'));
      this.setState({ graph: value, graphLoaded: true });
    }
    this.getInfo();
  }
  componentDidUpdate(prevState) {
    if (!this.state.allCoordinates.length && this.state.graph) {
      this.mapLinks();
      this.mapCoordinates();
    }
  }
  //----- INITIALIZE GRAPH -----

  //----- Travel -----
  travel = async (move, next_room_id = null) => {
    let data;
    if (next_room_id !== null) {
      data = {
        direction: move,
        next_room_id: next_room_id.toString()
      };
    } else {
      data = {
        direction: move
      };
    }

    try {
      const response = await axios({
        method: "post",
        url: "https://lambda-treasure-hunt.herokuapp.com/api/adv/move/",
        headers: { Authorization: myToken },
        data
      });

      let prev_room_id = this.state.room_id;
      let graph = this.updateGraph(
        response.data.room_id,
        this.parseCoordinates(response.data.coordinates),
        response.data.exits,
        prev_room_id,
        move
      );
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
        value: "",
        graph
      });
      console.log(response.data);
    } catch (err) {
      console.log(err);
    }
  };

  updateGraph = (id, coordinates, exits, prev_room_id = null, move = null) => {
    const { reverseDirection } = this.state;
    let graph = Object.assign(this.state.graph);
    if (!this.state.graph[id]) {
      let payload = [];
      payload.push(coordinates);
      const moves = {};
      exits.forEach(exit => {
        moves[exit] = "?";
      });
      payload.push(moves);
      graph = { ...graph, [id]: payload };
    }
    if (prev_room_id !== null && move && prev_room_id !== id) {
      graph[prev_room_id][1][move] = id;
      graph[id][1][reverseDirection[move]] = prev_room_id;
    }
    localStorage.setItem("graph", JSON.stringify(graph));
    return graph;
  };

  //---trying other method---
  traverseMap = () => {
    let count = 1;
    let unknownExits = this.getUnknownExits();
    console.log("unknown exits", unknownExits)
    if (unknownExits.length) {
      let move = unknownExits[0];
      this.travel(move);
    } else {
      let path = this.bft();

      if (typeof path === "string") {
      } else {
        console.log("path",path)
        for (let direction of path) {
          for (let d in direction) {
            setTimeout(() => {
              this.travel(d, direction[d]);
            }, 15 * 1000 * count + 1000);
            count++;
          }
        }
        if (this.state.visited.size < 499) {
          setTimeout(
            this.traverseMap(),
            this.state.cooldown * 1000 * count + 1000
          );
          this.updateVisited();
          count = 1;
        } else {
          console.log("Something went wrong");
        }
      }
    }
  };
  mapCoordinates = () => {
    const { graph } = this.state;
    const setCoordinates = [];
    for (let room in graph) {
      setCoordinates.push(graph[room][0]);
    }
    this.setState({ allCoordinates: setCoordinates });
  };
  mapLinks = () => {
    const { graph } = this.state;
    const setLinks = [];
    for(let room in graph){
      for (let linkedRoom in graph[room][1]) {
        setLinks.push([graph[room][0], graph[graph[room][1][linkedRoom]][0]]);
      }
    } 
    this.setState({ allLinks: setLinks});
  }
  updateVisited = () => {
    let visited = new Set(this.state.set);
    for (let key in this.state.graph) {
      if (!visited.has(key)) {
        let temp = [];
        for (let direction in key) {
          if (key[direction] === "?") {
            temp.push(direction);
          }
        }
        if (!temp.length) {
          visited.add(key);
        }
      }
    }
    let countVisited = visited.size / 500;
    this.setState({ visited, countVisited });
  };
  getUnknownExits = () => {
    let unknownExits = [];
    let directions = this.state.graph[this.state.room_id][1];
    for (let direction in directions) {
      if (directions[direction] === "?") {
        unknownExits.push(direction);
      }
    }
    return unknownExits;
  };
  parseCoordinates = coordinates => {
    const coordsObject = {};
    const coordsArray = coordinates.replace(/[{()}]/g, "").split(",");

    coordsArray.forEach(coord => {
      coordsObject["x"] = parseInt[coordsArray[0]];
      coordsObject["y"] = parseInt[coordsArray[1]];
    });
    return coordsObject;
  };

  // need an arrow function to bind properly
  // getInfo is my button to for init command, so I dont spam the server
  getInfo = () => {
    axios
      .get("https://lambda-treasure-hunt.herokuapp.com/api/adv/init", config)
      .then(res => {
        let graph = this.updateGraph(
          res.data.room_id,
          this.parseCoordinates(res.data.coordinates),
          res.data.exits
        );
        if (res.status === 200 && res.data) {
          console.log(res);
          this.setState(prevState => ({
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
          }));
          this.updateVisited();
        }
      })
      .catch(err => {
        console.log(err);
      });
  };
  getItem = async () => {
    let treasure = this.state.items;

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
    } catch (err) {
      console.log(err);
    }
  };
  handleChange = event => {
    event.preventDefault();
    this.setState({ value: event.target.value });
  };

  //========== BREADTH FIRST TRAVERSAL
  bft = (start = this.state.room_id, target = "?") => {
    let { graph } = this.state;
    let myQueue = [];
    let visited = new Set();
    for (let room in graph[start][1]) {
      myQueue = [...myQueue, [{ [room]: graph[start][1][room] }]];
    }
    while (myQueue.length) {
      let dequeued = myQueue.shift();
      let last_room = dequeued[dequeued.length - 1];

      for (let exit in last_room) {
        if (last_room[exit] === target) {
          dequeued.pop();
          return dequeued;
        } else {
          visited.add(last_room[exit]);

          for (let path in graph[last_room[exit]][1]) {
            if (visited.has(graph[last_room[exit]][1][path]) === false) {
              let path_copy = Array.from(dequeued);
              path_copy.push({ [path]: graph[last_room[exit]][1][path] });

              myQueue.push(path_copy);
            }
          }
        }
      }
    }
    return 'doesnt exist';
  };

  handleClick = () => {
    this.traverseMap();
  };
  render() {
    const { graph } = this.state
    // console.log("graph", graph)
    return (
      <React.Fragment>
        <DisplayContainer {...this.state} />
        {/* put this getInfo function into diaplsyContainer */}
        <Button onClick={() => this.getInfo()}>Update Info</Button>
        <Button onClick={() => this.travel("n")}>North</Button>
        <Button onClick={() => this.travel("e")}>East</Button>
        <Button onClick={() => this.travel("s")}>South</Button>
        <Button onClick={() => this.travel("w")}>West</Button>
        <Button onClick={() => this.handleClick()}>AutoTraverse</Button>
        <Button onClick={() => this.getItem()}>Pick Up Treasure</Button>
        { graph ? <GraphMap coordinates={this.state.allCoordinates} links={this.state.allLinks}/> : <div><p>graph loading</p></div> }
        

        <form>
          <label>
            Next Room ID:
            <input
              type="Number"
              value={this.state.value}
              onChange={this.handleChange}
            />
          </label>
        </form>
      </React.Fragment>
    );
  }
}
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
