// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@ganache/console.log/console.sol";

contract FlightSuretyData {
  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/

  address private contractOwner; // Account used to deploy contract

  mapping(address => bool) private authorizedContracts; // Contracts allowed to access data

  bool private operational = true; // Blocks all state changes throughout the contract if false

  // Flight status codees
  uint8 private constant STATUS_CODE_UNKNOWN = 0;
  uint8 private constant STATUS_CODE_ON_TIME = 10;
  uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
  uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
  uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
  uint8 private constant STATUS_CODE_LATE_OTHER = 50;

  struct Airline {
    address airlineAddress;
    string name;
    bool isRegistered;
    mapping(address => uint8) votes;
    uint256 numberOfVotes;
    uint256 funding;
    bool isActive;
  }

  mapping(address => Airline) private airlines;

  // Tracking airline addresses that have been registered
  address[] private registeredAirlineAddresses;

  // Tracking airline addresses that want to be registed but require votes
  address[] private pendingAirlineAddresses;

  struct Flight {
    bool isRegistered;
    uint8 statusCode;
    uint256 updatedTimestamp;
    address airline;
  }

  mapping(bytes32 => Flight) private flights;

  struct Insurance {
    uint256 value;
    address passenger;
    string flight;
    bool isPaid;
  }

  // Tracking bought insurances
  mapping(bytes32 => Insurance[]) private insurances;

  // Tracking payouts to passengers
  mapping(address => uint256) private payouts;

  /********************************************************************************************/
  /*                                       EVENT DEFINITIONS                                  */
  /********************************************************************************************/

  event AirlineRegistered(address airlineAddress);

  event AirlinePending(address airlineAddress);

  event AirlineActivated(address airlineAddress);

  event VoteAdded(address sender, address airlineAddress);

  event InsuranceBought(
    address passenger,
    uint256 value,
    string flight,
    address airline,
    uint256 timestamp
  );

  event PayoutsCalculated(
    address airlineAddress,
    string flight,
    uint256 timestamp
  );

  event PayoutProcessed(address receiver, uint256 value);

  event FlightRegistered(string flight, uint256 timestamp, address airline);

  event FundingAdded(address airlineAddress, uint256 value, uint256 newTotal);

  event CreatedOracle(bool isRegistered, uint8[3] indexes);

  /********************************************************************************************/
  /*                                       CONSTRUCTOR                                        */
  /********************************************************************************************/

  /**
   * @dev Constructor
   *      The deploying account becomes contractOwner and first airline is added
   */
  constructor(address airlineAddress, string memory newAirlineName) {
    contractOwner = msg.sender;

    // add first airline
    airlines[airlineAddress].airlineAddress = airlineAddress;
    airlines[airlineAddress].name = newAirlineName;
    airlines[airlineAddress].isRegistered = true;
    airlines[airlineAddress].votes[msg.sender] = 1;
    airlines[airlineAddress].numberOfVotes = 1;
    airlines[airlineAddress].funding = 0;
    airlines[airlineAddress].isActive = false;

    registeredAirlineAddresses.push(airlineAddress);
  }

  /********************************************************************************************/
  /*                                       FUNCTION MODIFIERS                                 */
  /********************************************************************************************/

  // Modifiers help avoid duplication of code. They are typically used to validate something
  // before a function is allowed to be executed.

  /**
   * @dev Modifier that requires the "operational" boolean variable to be "true"
   *      This is used on all state changing functions to pause the contract in
   *      the event there is an issue that needs to be fixed
   */
  modifier requireIsOperational() {
    require(operational, "Contract is currently not operational");
    _; // All modifiers require an "_" which indicates where the function body will be added
  }

  /**
   * @dev Modifier that requires the "ContractOwner" account to be the function caller
   */
  modifier requireContractOwner() {
    require(msg.sender == contractOwner, "Caller is not contract owner");
    _;
  }

  /**
   * @dev Modifier that requires an authorized contract to be the function caller
   */
  modifier requireAuthorizedContract() {
    require(authorizedContracts[msg.sender], "Caller is not authorized");
    _;
  }

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

  /**
   * @dev Function to set authorized caller
   *
   */
  function authorizeCaller(
    address contractAddress
  ) external requireContractOwner {
    authorizedContracts[contractAddress] = true;
  }

  /**
   * @dev Get operating status of contract
   *
   * @return A bool that is the current operating status
   */
  function isOperational() public view returns (bool) {
    return operational;
  }

  /**
   * @dev Sets contract operations on/off
   *
   * When operational mode is disabled, all write transactions except for this one will fail
   */
  function setOperatingStatus(bool mode) external requireContractOwner {
    operational = mode;
  }

  /**
   * @dev Check if airline is registered
   *
   * @return A bool indicates the airline if registered or not
   */
  function isAirlineRegistered(
    address airlineAddress
  ) external view returns (bool) {
    return airlines[airlineAddress].isRegistered;
  }

  /**
   * @dev Check if airline is active
   *
   * @return A bool indicates the airline if active or not
   */
  function isAirlineActive(
    address airlineAddress
  ) external view returns (bool) {
    return airlines[airlineAddress].isActive;
  }

  /**
   * @dev Check if airline is registered
   *
   * @return An int indicating the number of registered airlines
   */
  function getNumOfRegisteredAirlines() public view returns (uint256) {
    return registeredAirlineAddresses.length;
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *      Can only be called from FlightSuretyApp contract
   *
   */
  function registerAirline(
    address callerAddress,
    address airlineAddress,
    string calldata newAirlineName
  ) external payable requireIsOperational requireAuthorizedContract {
    // check if airline threshold has been reached
    bool isThresholdPassed = getNumOfRegisteredAirlines() >= 4;

    // add new airline
    airlines[airlineAddress].airlineAddress = airlineAddress;
    airlines[airlineAddress].name = newAirlineName;
    airlines[airlineAddress].isRegistered = !isThresholdPassed;
    airlines[airlineAddress].votes[callerAddress] = 1;
    airlines[airlineAddress].numberOfVotes = 1;
    airlines[airlineAddress].funding = msg.value;

    // registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines
    if (!isThresholdPassed) {
      registeredAirlineAddresses.push(airlineAddress);

      emit AirlineRegistered(airlineAddress);
    } else {
      pendingAirlineAddresses.push(airlineAddress);

      emit AirlinePending(airlineAddress);
    }

    if (msg.value >= 10 ether) {
      airlines[airlineAddress].isActive = true;

      emit AirlineActivated(airlineAddress);
    }
  }

  /**
   * @dev Add a vote for a (pending) airline
   *
   */
  function addVoteToAirline(
    address callerAddress,
    address airlineAddress
  ) external requireIsOperational requireAuthorizedContract {
    if (airlines[airlineAddress].votes[callerAddress] == 0) {
      airlines[airlineAddress].votes[callerAddress] = 1;
      airlines[airlineAddress].numberOfVotes++;

      emit VoteAdded(msg.sender, airlineAddress);

      if (
        !airlines[airlineAddress].isRegistered &&
        airlines[airlineAddress].numberOfVotes >=
        (registeredAirlineAddresses.length + 1) / 2
      ) {
        airlines[airlineAddress].isRegistered = true;

        registeredAirlineAddresses.push(airlineAddress);

        emit AirlineRegistered(airlineAddress);

        if (airlines[airlineAddress].funding >= 10 ether) {
          airlines[airlineAddress].isActive = true;

          emit AirlineActivated(airlineAddress);
        }
      }
    }
  }

  /**
   * @dev Buy insurance for a flight
   *
   */
  function buy(
    address passenger,
    uint256 value,
    string calldata flight,
    address airline,
    uint256 timestamp
  ) external payable requireIsOperational requireAuthorizedContract {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);

    Insurance memory insurance = Insurance({
      value: value,
      passenger: passenger,
      flight: flight,
      isPaid: false
    });

    insurances[flightKey].push(insurance);

    emit InsuranceBought(passenger, value, flight, airline, timestamp);
  }

  /**
   *  @dev Credits payouts to insurees
   */
  function creditInsurees(
    address airlineAddress,
    string memory flight,
    uint256 timestamp
  ) public requireIsOperational requireAuthorizedContract {
    bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

    Insurance[] storage payableInsurances = insurances[flightKey];

    for (uint256 index = 0; index < payableInsurances.length; index++) {
      Insurance storage insurance = payableInsurances[index];

      if (insurance.isPaid == false) {
        uint256 payout = (insurance.value * 150) / 100;

        payouts[insurance.passenger] = payouts[insurance.passenger] + payout;

        insurance.isPaid = true;
      }
    }

    emit PayoutsCalculated(airlineAddress, flight, timestamp);
  }

  /**
   *  @dev Transfers eligible payout funds to insuree
   *
   */
  function pay(
    address passengerAddress
  ) external payable requireIsOperational requireAuthorizedContract {
    require(payouts[passengerAddress] > 0, "There is nothing to be refunded");

    uint256 value = payouts[passengerAddress];

    payouts[passengerAddress] = 0;
    payable(passengerAddress).transfer(value);

    emit PayoutProcessed(passengerAddress, value);
  }

  /**
   * @dev Initial funding for the insurance. Unless there are too many delayed flights
   *      resulting in insurance payouts, the contract should be self-sustaining
   *
   */
  function fund(
    address airlineAddress,
    uint256 value
  ) public payable requireIsOperational requireAuthorizedContract {
    airlines[airlineAddress].funding = airlines[airlineAddress].funding + value;

    emit FundingAdded(
      airlineAddress,
      value,
      airlines[airlineAddress].funding + value
    );

    if (airlines[airlineAddress].funding >= 10 ether) {
      airlines[airlineAddress].isActive = true;

      emit AirlineActivated(airlineAddress);
    }
  }

  function registerFlight(
    string calldata flight,
    uint256 timestamp,
    address airline
  ) external payable requireIsOperational requireAuthorizedContract {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);

    flights[flightKey] = Flight({
      isRegistered: true,
      statusCode: 0,
      updatedTimestamp: timestamp,
      airline: airline
    });

    emit FlightRegistered(flight, timestamp, airline);
  }

  function processFlightStatus(
    address airline,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) external requireIsOperational requireAuthorizedContract {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);

    flights[flightKey].statusCode = statusCode;

    if (statusCode == STATUS_CODE_LATE_AIRLINE) {
      creditInsurees(airline, flight, timestamp);
    }
  }

  function getFlightKey(
    address airline,
    string memory flight,
    uint256 timestamp
  )
    internal
    view
    requireIsOperational
    requireAuthorizedContract
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
  }

  /**
   * @dev Fallback function for funding smart contract.
   *
   */
  fallback() external payable {}

  // Receive ether function
  receive() external payable {}
}
