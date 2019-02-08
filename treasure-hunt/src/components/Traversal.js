import React from "react";
import DisplayContainer from "./displayContainer";
import myToken from "../tokens/secretTokens";
import axios from "axios";
import styled from "styled-components";
import GraphMap from "./GraphMap";
import data from "./data.json";
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
      encumbrance: null,
      speed: null,
      strength: null,
      gold: null,
      inventory: [],
      name: "Hunter",
      visited: new Set()
    };
  }
  //====================== TRAVERSAL FUNCTIONS ======================
  componentDidMount() {
    if (localStorage.hasOwnProperty("graph")) {
      let value = JSON.parse(localStorage.getItem("graph"));
      this.setState({ graph: value, graphLoaded: true });
    } else {
      localStorage.setItem("graph", JSON.stringify(data));
      let value = JSON.parse(localStorage.getItem("graph"));
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
  randomExplore = async () => {
    const { cooldown, graph, room_id, items } = this.state;
    let exits = [...this.state.exits];
    let randomRoom = Math.floor(Math.random() * exits.length);
    let nextRoom = graph[room_id][1][exits[randomRoom]];
    if (this.state.encumbrance >= 9) {
      this.goToShop()
        .then(() => {
          this.sellTreasure();
        })
        .then(() => this.randomExplore);
    } else if (items.length) {
      this.getItem().then(() => this.randomExplore());
    } else {
      await this.timeoutFunc(1000 * cooldown);
      this.flyToRooms(exits[randomRoom], nextRoom).then(() =>
        this.randomExplore()
      );
    }
  };

  goToShop = async () => {
    const path = this.bft(this.state.room_id, 1);
    if (typeof path === "string") {
      console.log(path);
    } else {
      for (let direction of path) {
        console.log(direction);
        for (let d in direction) {
          await this.timeoutFunc(1000 * this.state.cooldown);
          await this.flyToRooms(d, direction[d]);
        }
      }
    }
  };
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
    if (prev_room_id !== null) {
      graph[prev_room_id][0].color = "#525959";
      graph[id][0].color = "#7dcdbe";
    } else {
      graph[0][0].color = "#525959";
      graph[id][0].color = "#7dcdbe";
    }
    localStorage.setItem("graph", JSON.stringify(graph));
    return graph;
  };
  timeoutFunc = async time => {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  };
  //---trying other method---
  traverseMap = () => {
    let count = 1;
    let unknownExits = this.getUnknownExits();
    console.log("unknown exits", unknownExits);
    if (unknownExits.length) {
      let move = unknownExits[0];
      this.travel(move);
    } else {
      let path = this.bft();

      if (typeof path === "string") {
      } else {
        console.log("path", path);
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
    for (let room in graph) {
      for (let linkedRoom in graph[room][1]) {
        setLinks.push([graph[room][0], graph[graph[room][1][linkedRoom]][0]]);
      }
    }
    this.setState({ allLinks: setLinks });
  };
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

  getAllItems = async () => {
    const { items, cooldown } = this.state;
    for ( let item of items ){
      await this.timeoutFunc(1000 * cooldown);
      await this.getItem(item)
    }
    await this.timeoutFunc( 1000 * cooldown)
  }
  getItem = name => {
     axios({
        method: "post",
        url: "https://lambda-treasure-hunt.herokuapp.com/api/adv/take/",
        headers: {
          Authorization: myToken
        },
        data: {
          name
        }
      }) .then(res => {
        console.log(res.data);
        this.setState(
          {
            messages: res.data.messages,
            items: res.data.items,
            players: res.data.players,
            cooldown: res.data.cooldown
          },
          () => this.timeoutFunc(1000 * res.data.cooldown).then(() => this.getStatus())
        );
      })

      .catch(err => {
        console.log('There was an error.');
        console.dir(err);
      });
  };
  prayToShrine = () => {
    axios({
      method: 'post',
      url: 'https://lambda-treasure-hunt.herokuapp.com/api/adv/pray/',
      headers: {
        Authorization: myToken
      }
    })
      .then(res => {
        console.log(res.data);
        this.setState({ messages: [...res.data.messages] }, () =>
          this.getStatus()
        );
      })
      .catch(err => {
        console.log('There was an error.');
        console.dir(err);
      });
  };

  changeName = () => {
    axios({
      method: 'post',
      url: 'https://lambda-treasure-hunt.herokuapp.com/api/adv/change_name/',
      headers: {
        Authorization: myToken
      },
      data: {
        name: 'Hunter'
      }
    })
      .then(res => {
        console.log(res.data);
        this.setState({ messages: [...res.data.messages] }, () =>
          this.getStatus()
        );
      })
      .catch(err => {
        console.log('There was an error.');
        console.dir(err);
      });
  };

  getStatus = () => {
    axios({
      method: 'post',
      url: 'https://lambda-treasure-hunt.herokuapp.com/api/adv/status/',
      headers: {
        Authorization: myToken
      }
    })
      .then(res => {
        console.log(res.data);

        this.setState(prevState => ({
          name: res.data.name,
          cooldown: res.data.cooldown,
          encumbrance: res.data.encumbrance,
          strength: res.data.strength,
          speed: res.data.speed,
          gold: res.data.gold,
          inventory: [...res.data.inventory],
          status: [...res.data.status],
          errors: [...res.data.errors]
        }));
      })
      .catch(err => {
        console.log('There was an error.');
        console.dir(err);
      });
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
    return "doesnt exist";
  };
  flyToRooms = async (move, next_room_id = null) => {
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
        method: 'post',
        url: `https://lambda-treasure-hunt.herokuapp.com/api/adv/fly/`,
        headers: {
          Authorization: myToken
        },
        data
      });

      let previous_room_id = this.state.room_id;

      //   Update graph
      let graph = this.updateGraph(
        response.data.room_id,
        this.parseCoordinates(response.data.coordinates),
        response.data.exits,
        previous_room_id,
        move
      );
      this.setState({
        room_id: response.data.room_id,
        coords: this.parseCoordinates(response.data.coordinates),
        exits: [...response.data.exits],
        cooldown: response.data.cooldown,
        messages: response.data.messages,
        description: response.data.description,
        title: response.data.title,
        players: response.data.players,
        items: response.data.items,
        graph
      });
      console.log(response.data);
    } catch (error) {
      console.log('Something went wrong moving...');
      console.dir(error);
      this.setState({
        cooldown: error.response.data.cooldown,
        messages: [...error.response.data.errors]
      });
      throw error;
    }
  };
  handleClick = () => {
    this.traverseMap();
  };
  render() {
    const { graph } = this.state;
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
        <Button onClick={() => this.getStatus()}>Get Status</Button>
        <Button onClick={() => this.randomExplore()}>Random Travels</Button>


        {graph ? (
          <GraphMap
            coordinates={this.state.allCoordinates}
            links={this.state.allLinks}
          />
        ) : (
          <div>
            <p>graph loading</p>
          </div>
        )}

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
