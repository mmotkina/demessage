import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import './App.css';

const contractAddress = '0x0ccbf671e3f0f8438d5504420b82949073c28245'; // Replace with your contract address

const contractABI = [
  {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "ProjectAdded",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "ProjectRemoved",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
          },
          {
              "indexed": true,
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "Subscribed",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
          },
          {
              "indexed": true,
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "Unsubscribed",
      "type": "event"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "addProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "",
              "type": "address"
          }
      ],
      "name": "allowedProjects",
      "outputs": [
          {
              "internalType": "bool",
              "name": "",
              "type": "bool"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "getSubscribers",
      "outputs": [
          {
              "internalType": "address[]",
              "name": "",
              "type": "address[]"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "user",
              "type": "address"
          },
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "isSubscribed",
      "outputs": [
          {
              "internalType": "bool",
              "name": "",
              "type": "bool"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "owner",
      "outputs": [
          {
              "internalType": "address",
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "removeProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "subscribe",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "",
              "type": "address"
          },
          {
              "internalType": "address",
              "name": "",
              "type": "address"
          }
      ],
      "name": "subscriptions",
      "outputs": [
          {
              "internalType": "bool",
              "name": "",
              "type": "bool"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "project",
              "type": "address"
          }
      ],
      "name": "unsubscribe",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  }
];


const App = () => {
  const [account, setAccount] = useState(localStorage.getItem('account') || null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [projectAddress, setProjectAddress] = useState('');
  const [messages, setMessages] = useState([]);
  const [approvedProjects, setApprovedProjects] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [recipientAddress, setRecipientAddress] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isAllowedProject, setIsAllowedProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [eventType, setEventType] = useState('');
  const [projectNames, setProjectNames] = useState({});

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (account) {
      initializeProviderAndContract();
    }
  }, [account]);

  useEffect(() => {
    if (approvedProjects.length > 0) {
      getMessages();
    }
  }, [approvedProjects]);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setProvider(null);
      setSigner(null);
      setContract(null);
      localStorage.removeItem('account');
    } else {
      setAccount(accounts[0]);
      localStorage.setItem('account', accounts[0]);
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        localStorage.setItem('account', accounts[0]);
      } catch (error) {
        console.error("User denied account access", error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  const initializeProviderAndContract = async () => {
    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const newContract = new ethers.Contract(contractAddress, contractABI, newSigner);
      setProvider(newProvider);
      setSigner(newSigner);
      setContract(newContract);
      await checkIfOwner(newContract);
      await checkIfAllowedProject(newContract);
      await fetchApprovedProjects(newContract);
      await fetchProjectNames();
    } catch (error) {
      console.error("Failed to initialize provider and contract:", error);
    }
  };

  const checkIfOwner = async (contractInstance) => {
    const owner = await contractInstance.owner();
    setIsOwner(owner.toLowerCase() === account.toLowerCase());
  };

  const checkIfAllowedProject = async (contractInstance) => {
    const isAllowed = await contractInstance.allowedProjects(account.toLowerCase());
    setIsAllowedProject(isAllowed);
  };

  const fetchApprovedProjects = async (contractInstance) => {
    try {
      const filter = contractInstance.filters.ProjectAdded();
      const events = await contractInstance.queryFilter(filter);
      const projects = events.map(event => event.args.project);
      console.log('setApprovedProjects', projects)
      setApprovedProjects(projects);
      // Check subscription status for each project
      const subs = {};
      for (let project of projects) {
        const isSubscribed = await contractInstance.isSubscribed(account, project);
        subs[project] = isSubscribed;
      }
      setSubscriptions(subs);
    } catch (error) {
      console.error("Error fetching approved projects:", error);
    }
  };

  const getMessages = async () => {
    try {
      const q = query(collection(db, "messages"), where("recipient", "==", account));
      const querySnapshot = await getDocs(q);
      const userMessages = [];
      const normalizedApprovedProjects = approvedProjects.map(project => project.toLowerCase());

      // Fetch project names
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const projectNames = {};
      projectsSnapshot.forEach((doc) => {
        const projectData = doc.data();
        projectNames[projectData.wallet.toLowerCase()] = projectData.name;
      });

      querySnapshot.forEach((doc) => {
        const message = doc.data();
        console.log('normalizedApprovedProjects', normalizedApprovedProjects)
        if (normalizedApprovedProjects.includes(message.project)) {
          userMessages.push({
            ...message,
            formattedTimestamp: formatDate(message.timestamp),
            projectName: projectNames[message.project.toLowerCase()] || ''
          });
        }
      });

     // Sort messages from new to old
     userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setMessages(userMessages);
      console.log('userMessages', userMessages, '-', messages)
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    console.log('sendMessage', messageContent, '')
    if (messageContent.length > 600) {
      alert("Message cannot exceed 600 characters");
      return;
    }
    try {
      const subscribers = await contract.getSubscribers(account);
      console.log('sendMessage subscribers', subscribers)
      for (let subscriber of subscribers) {
        await addDoc(collection(db, "messages"), {
          project: account,
          recipient: subscriber.toLowerCase(),
          content: messageContent,
          timestamp: new Date().toISOString(),
          eventType: eventType
        });
      }
      alert('Message sent to subscribers');
      setMessageContent('');
      setEventType('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };


  const addProjectToContract = async () => {
    if (projectAddress) {
      try {
        const isApproved = await contract.allowedProjects(projectAddress.toLowerCase());
        if (isApproved) {
          alert('Project is already approved.');
          return;
        }
  
        const tx = await contract.addProject(projectAddress.toLowerCase());
        await tx.wait();
        alert('Project added');
        setProjectAddress('');
        fetchApprovedProjects(contract);
      } catch (error) {
        console.error("Error adding project:", error);
      }
    }
  };

  const removeProjectFromContract = async () => {
    if (projectAddress) {
      try {
        const tx = await contract.removeProject(projectAddress);
        await tx.wait();
        alert('Project removed');
        setProjectAddress('');
        fetchApprovedProjects(contract);
      } catch (error) {
        console.error("Error removing project:", error);
      }
    }
  };

  const subscribeToProject = async (project) => {
    try {
      const tx = await contract.subscribe(project.toLowerCase());
      await tx.wait();
      alert('Subscribed to project');
      fetchApprovedProjects(contract);
    } catch (error) {
      console.error("Error subscribing to project:", error);
    }
  };

  const unsubscribeFromProject = async (project) => {
    try {
      const tx = await contract.unsubscribe(project.toLowerCase());
      await tx.wait();
      alert('Unsubscribed from project');
      fetchApprovedProjects(contract);
    } catch (error) {
      console.error("Error unsubscribing from project:", error);
    }
  };

  const addProjectName = async () => {
    console.log('addProjectName', projectName)
    if (projectName) {
      try {
        await setDoc(doc(db, "projects", account), {
          name: projectName,
          wallet: account
        });
        setProjectName('');
        alert('Project name added');
      } catch (error) {
        console.error("Error adding project name:", error);
      }
    }
  };

  const fetchProjectNames = async () => {
    try {
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const names = {};
      projectsSnapshot.forEach((doc) => {
        const projectData = doc.data();
        names[projectData.wallet.toLowerCase()] = projectData.name;
      });
      setProjectNames(names);
    } catch (error) {
      console.error("Error fetching project names:", error);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMilliseconds = now - date;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    const diffInMinutes = diffInMilliseconds / (1000 * 60);
    
    if (diffInHours < 6) {
      if (diffInMinutes < 60) {
        const minutes = Math.floor(diffInMinutes);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else {
        const hours = Math.floor(diffInHours);
        const minutes = Math.floor(diffInMinutes % 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
    } else {
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
      const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  
      const time = date.toLocaleTimeString('en-GB', timeOptions);
      const day = date.toLocaleDateString('en-GB', dateOptions);
  
      return `${time} ${day}`;
    }
  };

  const formatMessageContent = (content) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return content.split(urlPattern).map((part, index) =>
      urlPattern.test(part) ? <a href={part} key={index} target="_blank" rel="noopener noreferrer">{part}</a> : part
    );
  };
  

  return (
    <div className="container">
      {!account && (
        <div className="connect_wallet">
          <h1>Demessage</h1>
          <div>Connect your wallet to view your messages and subscribe to projects.</div>
          <button className="connect_wallet_button" onClick={connectWallet}>Connect Wallet</button>
        </div>
      )}

      {account && (
        <div className='wallet_connected'>
            <div><h1>Demessage</h1></div>
            <div>
                <span className='project_name'>{projectNames[account] && `${projectNames[account]}`} </span>
                <span className='project_address'>{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</span>
            </div>
        </div>
      )}
      <div className='content'>
      <div className='left_panel'>
        {account && (
          <div className='messages'>
            <h2>Messages</h2>
            {/* <button onClick={getMessages}>Get Messages</button> */}
              {messages.map((message, index) => (
                <div className='message'>
                  <div className='message_header'>
                    <div><span className='project_name'>{message.projectName}</span> {`${message.project.substring(0, 6)}...${message.project.substring(message.project.length - 4)}`}, {message.formattedTimestamp}</div>
                    <div className={message.eventType === 'Important' ? 'message_important event_type' : 'event_type'}>{message.eventType}</div>
                  </div>
                  <div className='message_text'>{formatMessageContent(message.content)}</div>
                </div>
              ))}
          </div>
        )}
        {account && (
          <div>
            <h2>Projects</h2>
            <ul>
              {approvedProjects.map((project, index) => (
                <li key={index}>
                  <span className='project_name'>{projectNames[project.toLowerCase()] || ''} </span>
                  <span className='project_address'>{project}</span>
                  <div className='subscribe_buttons double_buttons'>
                    <button onClick={() => subscribeToProject(project)} disabled={subscriptions[project]}>Subscribe</button>
                    <button onClick={() => unsubscribeFromProject(project)} disabled={!subscriptions[project]}>Unsubscribe</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className='right_panel'>
          {isOwner && (
            <div className="owner_panel">
              <h2>Admin panel</h2>
              <input
                type="text"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="Project Wallet Address"
              />
              <div className='double_buttons'>
                <button onClick={addProjectToContract}>Add Project</button>
                <button onClick={removeProjectFromContract}>Remove Project</button>
              </div>
            </div>
          )}

          <div className="project_panel">
            {isAllowedProject && (
              <div>
                <h2>Send message to subscribers</h2>
                <textarea
                  className='message_input'
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Message (max 600 characters)"
                />
                <select placeholder="Choose message type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="" disabled>Message type</option>
                  <option value="Important">Important</option>
                  <option value="Personal">Personal</option>
                  <option value="Product updates">Product updates</option>
                  <option value="Events">Events</option>
                  <option value="Educational">Educational</option>
                </select>
                <button onClick={sendMessage}>Send Message</button>
              </div>
            )}

            {isAllowedProject && (
              <div>
                <h2>Change project name</h2>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                />
                <button onClick={addProjectName}>Set Project Name</button>
              </div>
            )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default App;
