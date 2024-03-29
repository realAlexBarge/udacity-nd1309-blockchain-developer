// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./FlightSuretyData.sol";

import "@ganache/console.log/console.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/

  address private contractOwner; // Account used to deploy contract
  bool private operational = true; // Blocks all state changes throughout the contract if false

  // Use data from data contract
  FlightSuretyData private flightSuretyData;

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
    // Modify to call data contract's status
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

  /********************************************************************************************/
  /*                                       CONSTRUCTOR                                        */
  /********************************************************************************************/

  /**
   * @dev Contract constructor
   *
   */
  constructor(address payable flightSuretyDataAddress) {
    contractOwner = msg.sender;

    // initialize data based on data contract provided
    flightSuretyData = FlightSuretyData(flightSuretyDataAddress);
  }

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

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
   * @dev Modifier that requires an existing airline to be the caller
   */
  modifier requireRegisteredAirlineCaller() {
    require(
      flightSuretyData.isAirlineRegistered(msg.sender),
      "Only existing airline allowed to call"
    );
    _;
  }

  /**
   * @dev Modifier that requires an existing airline to be the caller
   */
  modifier requireActiveAirlineCaller() {
    require(
      flightSuretyData.isAirlineActive(msg.sender),
      "Only active airline allowed to call"
    );
    _;
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *
   */
  function registerAirline(
    address newAirlineAddress,
    string calldata newAirlineName
  ) external payable requireIsOperational requireActiveAirlineCaller {
    flightSuretyData.registerAirline{ value: msg.value }(
      msg.sender,
      newAirlineAddress,
      newAirlineName
    );
  }

  /**
   * @dev Add a vote for a (pending) airline
   *
   */
  function addVoteToAirline(
    address airlineAddress
  ) external requireIsOperational requireActiveAirlineCaller {
    flightSuretyData.addVoteToAirline(msg.sender, airlineAddress);
  }

  // this only allows the airline to fund itself
  function addFundingToAirline()
    public
    payable
    requireIsOperational
    requireRegisteredAirlineCaller
  {
    flightSuretyData.fund(msg.sender, msg.value);

    payable(flightSuretyData).transfer(msg.value);
  }

  function purchaseInsurance(
    address airlineAddress,
    string calldata flight,
    uint256 timestamp
  ) public payable requireIsOperational {
    flightSuretyData.buy(
      msg.sender,
      msg.value,
      flight,
      airlineAddress,
      timestamp
    );

    payable(flightSuretyData).transfer(msg.value);
  }

  function withdraw() public requireIsOperational {
    flightSuretyData.pay(msg.sender);
  }

  /**
   * @dev Register a future flight for insuring.
   *
   */
  function registerFlight(
    string calldata flight,
    uint256 timestamp,
    address airline
  ) external payable requireIsOperational {
    flightSuretyData.registerFlight(flight, timestamp, airline);
  }

  /**
   * @dev Called after oracle has updated flight status
   *
   */
  function processFlightStatus(
    address airline,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) internal requireIsOperational {
    flightSuretyData.processFlightStatus(
      airline,
      flight,
      timestamp,
      statusCode
    );
  }

  // Generate a request for oracles to fetch flight information
  function fetchFlightStatus(
    address airline,
    string memory flight,
    uint256 timestamp
  ) external requireIsOperational {
    uint8 index = getRandomIndex();

    // Generate a unique key for storing the request
    bytes32 key = keccak256(
      abi.encodePacked(index, airline, flight, timestamp)
    );

    oracleResponses[key].requester = msg.sender;
    oracleResponses[key].isOpen = true;

    emit OracleRequest(index, airline, flight, timestamp);
  }

  // region ORACLE MANAGEMENT

  // Incremented to add pseudo-randomness at various points
  uint8 private nonce = 0;

  // Fee to be paid when registering oracle
  uint256 public constant REGISTRATION_FEE = 1 ether;

  // Number of oracles that must respond for valid status
  uint256 private constant MIN_RESPONSES = 3;

  struct Oracle {
    bool isRegistered;
    uint8[3] indexes;
  }

  // Track all registered oracles
  mapping(address => Oracle) private oracles;

  // Model for responses from oracles
  struct ResponseInfo {
    address requester; // Account that requested status
    bool isOpen; // If open, oracle responses are accepted
    mapping(uint8 => address[]) responses; // Mapping key is the status code reported
    // This lets us group responses and identify
    // the response that majority of the oracles
  }

  // Track all oracle responses
  // Key = hash(index, flight, timestamp)
  mapping(bytes32 => ResponseInfo) private oracleResponses;

  // Event fired each time an oracle submits a response
  event FlightStatusInfo(
    address airline,
    string flight,
    uint256 timestamp,
    uint8 status
  );

  event OracleReport(
    address airline,
    string flight,
    uint256 timestamp,
    uint8 status
  );

  // Event fired when flight status request is submitted
  // Oracles track this and if they have a matching index
  // they fetch data and submit a response
  event OracleRequest(
    uint8 index,
    address airline,
    string flight,
    uint256 timestamp
  );

  // Register an oracle with the contract
  function registerOracle() external payable {
    // Require registration fee
    require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

    uint8[3] memory indexes = generateIndexes();

    oracles[msg.sender] = Oracle({ isRegistered: true, indexes: indexes });
  }

  function getMyIndexes() external view returns (uint8[3] memory) {
    require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

    return oracles[msg.sender].indexes;
  }

  // Called by oracle when a response is available to an outstanding request
  // For the response to be accepted, there must be a pending request that is open
  // and matches one of the three Indexes randomly assigned to the oracle at the
  // time of registration (i.e. uninvited oracles are not welcome)
  function submitOracleResponse(
    uint8 index,
    address airline,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode
  ) external {
    require(
      (oracles[msg.sender].indexes[0] == index) ||
        (oracles[msg.sender].indexes[1] == index) ||
        (oracles[msg.sender].indexes[2] == index),
      "Index does not match oracle request"
    );

    bytes32 key = keccak256(
      abi.encodePacked(index, airline, flight, timestamp)
    );

    require(
      oracleResponses[key].isOpen,
      "Flight or timestamp do not match oracle request"
    );

    oracleResponses[key].responses[statusCode].push(msg.sender);

    // Information isn't considered verified until at least MIN_RESPONSES
    // oracles respond with the *** same *** information
    emit OracleReport(airline, flight, timestamp, statusCode);

    if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
      emit FlightStatusInfo(airline, flight, timestamp, statusCode);

      // Handle flight status as appropriate
      processFlightStatus(airline, flight, timestamp, statusCode);
    }
  }

  function getFlightKey(
    address airline,
    string memory flight,
    uint256 timestamp
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
  }

  // Returns array of three non-duplicating integers from 0-9
  function generateIndexes() internal returns (uint8[3] memory) {
    uint8[3] memory indexes;
    indexes[0] = getRandomIndex();

    indexes[1] = indexes[0];
    while (indexes[1] == indexes[0]) {
      indexes[1] = getRandomIndex();
    }

    indexes[2] = indexes[1];
    while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
      indexes[2] = getRandomIndex();
    }

    return indexes;
  }

  // Returns array of three non-duplicating integers from 0-9
  function getRandomIndex() internal returns (uint8) {
    uint8 maxValue = 10;

    // Pseudo random number...the incrementing nonce adds variation
    uint8 random = uint8(
      uint256(
        // abi.encodePacked(blockhash(block.number - nonce++), account)
        keccak256(abi.encodePacked(block.timestamp, block.prevrandao, nonce++))
      )
    ) % maxValue;

    if (nonce > 250) {
      nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
    }

    return random;
  }

  // endregion
}
