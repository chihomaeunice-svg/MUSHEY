import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={{padding:"20px", display:"flex", gap:"20px"}}>

      <Link to="/">Dashboard</Link>
      <Link to="/properties">Properties</Link>
      <Link to="/tenants">Tenants</Link>
      <Link to="/payments">Payments</Link>

    </div>
  );
}

export default Navbar;