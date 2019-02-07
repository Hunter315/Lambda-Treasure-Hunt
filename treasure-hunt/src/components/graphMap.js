import React from "react";
import { FlexibleXYPlot, LineSeries, MarkSeries } from "react-vis";

 class GraphMap extends React.Component {
  state = {};

  render() {
    const { coordinates, links } = this.props;
    console.log("coordinates ", coordinates)
    console.log("links ", links)
    return (
      <div
        style={{
          margin: "auto",
          width: "100%",
          height: "100%"
        }}
      > <p>My map should be</p>
        <FlexibleXYPlot>
          {links.map(link => (
            <LineSeries strokeWidth="3" color="#E5E5E5" data={link} />
          ))}
          <MarkSeries
            className="ms"
            strokeWidth={5}
            opacity="1"
            size="2"
            color="#525959"
            data={coordinates}
          />
        </FlexibleXYPlot>
        <p>-- between these</p>
      </div>
    );
  }
}

export default GraphMap;