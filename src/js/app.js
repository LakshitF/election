//Web3 and ethereum object is injected while running it with http or https protocol and not as single static html file
//Hence you needed a lite server: Took 1 hour to realize this.

App = {

  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: function() {


    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask. // THAT IS IF YOU ALREADY HAVE LOGGED IN WITH A ACCOUNT
      App.web3Provider = web3.currentProvider;
      ethereum.enable();
      web3 = new Web3(web3.currentProvider);
    } 
    else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      //App.listenForEvents(); Writing this here will render candidate 1,2 many times.
      //removing it is also creating problems that the app is not reloading upon change

      return App.render();
    });
  },

  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {

      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        
        App.render();
      });
    });
  },

  render: function() {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    loader.hide();
    content.show();
    // Load contract data
    
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();
      console.log("loop 1");  //declare a function and call it
      (async function forloop(){

        for (var i = 1; i <= candidatesCount; i++) {
          
          await electionInstance.candidates(i).then(function(candidate) {
            var id = candidate[0];
            var name = candidate[1];
            var voteCount = candidate[2];
  
            // Render candidate Result
            var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
            candidatesResults.append(candidateTemplate);
  
            // Render candidate ballot option
            var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
            candidatesSelect.append(candidateOption);
          });

          console.log("i = ",i);
          console.log("candidate Results has value",document.getElementById("candidatesResults").innerText);
        }

      })();

      

      return electionInstance.voters(App.account);  //The address in voters[] map is mapped to a bool value indic whether person voted or not
    }).then((res)=> { //res is that bool value
      //Hides the button
      if(res) {
        $('form').hide();
      }
      
    }).catch(function(error) {
      console.warn(error);
    });
  },
  //here even if you unhide the vote button, if the candidate has already voted, transactionw would raise an exception if you try to vote again
  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account }); //the function in the Election.sol marks that this person has voted
    }).then(function(result) {
      App.render();
      
    }).catch(function(err) {
      console.error(err);
    });
  }
};

App.init();
