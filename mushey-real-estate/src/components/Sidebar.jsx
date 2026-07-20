import { Link } from "react-router-dom";
import "../styles/sidebar.css";

function Sidebar(){

  return(

    <div style={{padding:"20px", display:"flex", gap:"20px"}} className="sidebar">

      <h2>Mushey</h2>

      <Link to="/">Dashboard</Link>
      <Link to="/properties">Properties</Link>
      <Link to="/payments">Payments</Link>

    </div>

  )

}

export default Sidebar;