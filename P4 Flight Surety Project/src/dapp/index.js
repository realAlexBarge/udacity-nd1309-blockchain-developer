import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Add flights  to selection
    const FLIGHTS = [
      { flight: "AB12", timestamp: new Date(2023, 2, 1).getTime() },
      { flight: "BC23", timestamp: new Date(2023, 3, 1).getTime() },
      { flight: "CD34", timestamp: new Date(2023, 4, 1).getTime() },
      { flight: "DE45", timestamp: new Date(2023, 5, 1).getTime() },
      { flight: "EF56", timestamp: new Date(2023, 6, 1).getTime() },
      { flight: "FG67", timestamp: new Date(2023, 7, 1).getTime() },
      { flight: "GH78", timestamp: new Date(2023, 8, 1).getTime() },
      { flight: "HI89", timestamp: new Date(2023, 9, 1).getTime() },
      { flight: "IJ90", timestamp: new Date(2023, 10, 1).getTime() },
    ];

    for (let i = 0; i < FLIGHTS.length; i++) {
      let entry = FLIGHTS[i];
      let option = document.createElement("option");

      option.text = `Flight ${entry.flight}`;

      option.value = entry.flight + " " + entry.timestamp;

      DOM.elid("select-flight").add(option);
    }

    // Read transaction
    contract.isOperational((error, result) => {
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    // Oracle events

    contract.flightSuretyApp.events.FlightStatusInfo(
      {
        fromBlock: "latest",
      },
      function (error, result) {
        if (error) {
          console.log(error);
        } else {
          display("Flight Status Info", "Flight Status Received", [
            {
              label: "Flight Status",
              error: error,
              value: `flight:  ${result.returnValues.flight}, status: ${
                result.returnValues.status == 10 ? "ON TIME" : "DELAYED"
              }`,
            },
          ]);
        }
      }
    );

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      contract.fetchFlightStatus(flight, (error, result) => {
        console.log(result);
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });

    DOM.elid("buy-insurance").addEventListener("click", () => {
      let sel = document.getElementById("select-flight");
      let flightString = sel.options[sel.selectedIndex].value;
      let value = DOM.elid("value").value;

      let arr = flightString.split(" ");

      let flight = arr.splice(0, 1).join("");
      let timestamp = arr.join(" ");

      DOM.elid("value").value = "";

      if (flight && timestamp && value) {
        contract.buyInsurance(flight, timestamp, value, (error, result) => {
          console.log(error, result, value);
        });
      }
    });
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
