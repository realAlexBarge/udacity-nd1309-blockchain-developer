// This script is designed to test the solidity smart contract - SuppyChain.sol -- and the various functions within
// Declare a variable and assign the compiled smart contract artifact
var SupplyChain = artifacts.require("SupplyChain");

const ItemStates = {
  Harvested: 0, // 0
  Processed: 1, // 1
  Packed: 2, // 2
  ForSale: 3, // 3
  Sold: 4, // 4
  Shipped: 5, // 5
  Received: 6, // 6
  Purchased: 7, // 7
};

contract("SupplyChain", function (accounts) {
  // Declare few constants and assign a few sample accounts generated by ganache-cli
  var sku = 1;
  var upc = 1;
  const ownerID = accounts[0];
  const originFarmerID = accounts[1];
  const originFarmName = "John Doe";
  const originFarmInformation = "Yarray Valley";
  const originFarmLatitude = "-38.239770";
  const originFarmLongitude = "144.341490";
  var productID = sku + upc;
  const productNotes = "Best beans for Espresso";
  const productPrice = web3.toWei(1, "ether");
  var itemState = 0;
  const distributorID = accounts[2];
  const retailerID = accounts[3];
  const consumerID = accounts[4];
  const emptyAddress = "0x00000000000000000000000000000000000000";
  let supplyChain;

  ///Available Accounts
  ///==================
  ///(0) 0x27d8d15cbc94527cadf5ec14b69519ae23288b95
  ///(1) 0x018c2dabef4904ecbd7118350a0c54dbeae3549a
  ///(2) 0xce5144391b4ab80668965f2cc4f2cc102380ef0a
  ///(3) 0x460c31107dd048e34971e57da2f99f659add4f02
  ///(4) 0xd37b7b8c62be2fdde8daa9816483aebdbd356088
  ///(5) 0x27f184bdc0e7a931b507ddd689d76dba10514bcb
  ///(6) 0xfe0df793060c49edca5ac9c104dd8e3375349978
  ///(7) 0xbd58a85c96cc6727859d853086fe8560bc137632
  ///(8) 0xe07b5ee5f738b2f87f88b99aac9c64ff1e0c7917
  ///(9) 0xbd3ff2e3aded055244d66544c9c059fa0851da44

  console.log("ganache-cli accounts used here...");
  console.log("Contract Owner: accounts[0] ", accounts[0]);
  console.log("Farmer: accounts[1] ", accounts[1]);
  console.log("Distributor: accounts[2] ", accounts[2]);
  console.log("Retailer: accounts[3] ", accounts[3]);
  console.log("Consumer: accounts[4] ", accounts[4]);

  beforeEach(async () => {
    supplyChain = await SupplyChain.deployed({ from: ownerID });

    await supplyChain.addFarmer(accounts[1]);
    await supplyChain.addDistributor(accounts[2]);
    await supplyChain.addRetailer(accounts[3]);
    await supplyChain.addConsumer(accounts[4]);
  });

  // 1st Test
  it("Testing smart contract function harvestItem() that allows a farmer to harvest banana", async () => {
    // Declare and Initialize a variable for event
    var eventEmitted = false;

    // Watch the emitted event Harvested()
    var event = supplyChain.Harvested();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Harvested by calling function harvestItem()
    await supplyChain.harvestItem(
      upc,
      originFarmerID,
      originFarmName,
      originFarmInformation,
      originFarmLatitude,
      originFarmLongitude,
      productNotes,
      { from: originFarmerID }
    );

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferOne = await supplyChain.fetchItemBufferOne.call(upc);
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferOne[0], sku, "Invalid item SKU");
    assert.equal(resultBufferOne[1], upc, "Invalid item UPC");
    assert.equal(resultBufferOne[2], originFarmerID, "Invalid ownerID");
    assert.equal(resultBufferOne[3], originFarmerID, "Invalid originFarmerID");
    assert.equal(resultBufferOne[4], originFarmName, "Invalid originFarmName");
    assert.equal(
      resultBufferOne[5],
      originFarmInformation,
      "Invalid originFarmInformation"
    );
    assert.equal(
      resultBufferOne[6],
      originFarmLatitude,
      "Invalid originFarmLatitude"
    );
    assert.equal(
      resultBufferOne[7],
      originFarmLongitude,
      "Invalid originFarmLongitude"
    );
    assert.equal(
      resultBufferTwo[5],
      ItemStates.Harvested,
      "Invalid item State"
    );
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 2nd Test
  it("Testing smart contract function processItem() that allows a farmer to process banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Processed()
    var event = supplyChain.Processed();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Processed by calling function processtItem()
    await supplyChain.processItem(upc, { from: originFarmerID });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(
      resultBufferTwo[5],
      ItemStates.Processed,
      "Invalid item State"
    );
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 3rd Test
  it("Testing smart contract function packItem() that allows a farmer to pack banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Packed()
    var event = supplyChain.Packed();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Packed by calling function packItem()
    await supplyChain.packItem(upc, { from: originFarmerID });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferTwo[5], ItemStates.Packed, "Invalid item State");
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 4th Test
  it("Testing smart contract function sellItem() that allows a farmer to sell banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event ForSale()
    var event = supplyChain.ForSale();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as ForSale by calling function sellItem()
    await supplyChain.sellItem(upc, productPrice, {
      from: originFarmerID,
    });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferTwo[5], ItemStates.ForSale, "Invalid item State");
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 5th Test
  it("Testing smart contract function buyItem() that allows a distributor to buy banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Sold()
    var event = supplyChain.Sold();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Sold by calling function buyItem()
    await supplyChain.buyItem(upc, {
      from: distributorID,
      value: productPrice,
    });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferTwo[5], ItemStates.Sold, "Invalid item State");
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 6th Test
  it("Testing smart contract function shipItem() that allows a distributor to ship banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Shipped()
    var event = supplyChain.Shipped();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Sold by calling function shipItem()
    await supplyChain.shipItem(upc, {
      from: distributorID,
    });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferTwo[5], ItemStates.Shipped, "Invalid item State");
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 7th Test
  it("Testing smart contract function receiveItem() that allows a retailer to mark banana received", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Received()
    var event = supplyChain.Received();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Sold by calling function receiveItem()
    await supplyChain.receiveItem(upc, {
      from: retailerID,
    });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(resultBufferTwo[5], ItemStates.Received, "Invalid item State");
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 8th Test
  it("Testing smart contract function purchaseItem() that allows a consumer to purchase banana", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    // Watch the emitted event Purchased()
    var event = supplyChain.Purchased();
    await event.watch((err, res) => {
      eventEmitted = true;
    });

    // Mark an item as Sold by calling function purchaseItem()
    await supplyChain.purchaseItem(upc, {
      from: consumerID,
    });

    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set
    assert.equal(
      resultBufferTwo[5],
      ItemStates.Purchased,
      "Invalid item State"
    );
    assert.equal(eventEmitted, true, "Invalid event emitted");
  });

  // 9th Test
  it("Testing smart contract function fetchItemBufferOne() that allows anyone to fetch item details from blockchain", async () => {
    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferOne = await supplyChain.fetchItemBufferOne.call(upc);

    // Verify the result set:
    assert.equal(resultBufferOne[0], sku, "Invalid item SKU");
    assert.equal(resultBufferOne[1], upc, "Invalid item UPC");
    assert.equal(resultBufferOne[2], consumerID, "Invalid ownerID");
    assert.equal(resultBufferOne[3], originFarmerID, "Invalid originFarmerID");
    assert.equal(resultBufferOne[4], originFarmName, "Invalid originFarmName");
    assert.equal(
      resultBufferOne[5],
      originFarmInformation,
      "Invalid originFarmInformation"
    );
    assert.equal(
      resultBufferOne[6],
      originFarmLatitude,
      "Invalid originFarmLatitude"
    );
    assert.equal(
      resultBufferOne[7],
      originFarmLongitude,
      "Invalid originFarmLongitude"
    );
  });

  // 10th Test
  it("Testing smart contract function fetchItemBufferTwo() that allows anyone to fetch item details from blockchain", async () => {
    // Retrieve the just now saved item from blockchain by calling function fetchItem()
    const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

    // Verify the result set:
    assert.equal(resultBufferTwo[0], sku, "Invalid item SKU");
    assert.equal(resultBufferTwo[1], upc, "Invalid item UPC");
    assert.equal(resultBufferTwo[2], productID, "Invalid productID");
    assert.equal(resultBufferTwo[3], productNotes, "Invalid productNotes");
    assert.equal(resultBufferTwo[4], productPrice, "Invalid productPrice");
    assert.equal(resultBufferTwo[5], 7, "Invalid itemState");
    assert.equal(resultBufferTwo[6], distributorID, "Invalid distributorID");
    assert.equal(resultBufferTwo[7], retailerID, "Invalid retailerID");
    assert.equal(resultBufferTwo[8], consumerID, "Invalid consumerID");
  });
});