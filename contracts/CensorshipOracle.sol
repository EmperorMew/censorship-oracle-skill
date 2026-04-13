// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CensorshipOracle
 * @notice On-chain censorship intelligence oracle powered by Voidly.
 *         Stores country risk scores and censorship incident attestations.
 * @author Voidly (voidly.ai)
 */
contract CensorshipOracle {
    address public owner;
    uint256 public totalAttestations;

    struct CountryRisk {
        uint8 score;
        uint64 updatedAt;
        uint16 incidentCount;
    }

    struct Incident {
        bytes2 countryCode;
        uint8 confidence;
        uint8 severity; // 1=info, 2=warning, 3=critical
        uint32 measurements;
        uint64 timestamp;
        address attestedBy;
    }

    mapping(bytes2 => CountryRisk) public countryRisks;
    mapping(bytes32 => Incident) public incidents;
    bytes2[] public scoredCountries;
    mapping(bytes2 => bool) private _exists;

    event CountryRiskUpdated(bytes2 indexed country, uint8 score, uint16 incidents, uint64 ts);
    event IncidentAttested(bytes32 indexed incidentHash, bytes2 indexed country, uint8 severity, uint8 confidence, uint64 ts);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function updateCountryRisk(bytes2 country, uint8 score, uint16 incidentCount) external onlyOwner {
        if (!_exists[country]) {
            scoredCountries.push(country);
            _exists[country] = true;
        }
        countryRisks[country] = CountryRisk(score, uint64(block.timestamp), incidentCount);
        emit CountryRiskUpdated(country, score, incidentCount, uint64(block.timestamp));
    }

    function attestIncident(
        bytes32 incidentHash,
        bytes2 country,
        uint8 severity,
        uint8 confidence,
        uint32 measurements,
        uint64 timestamp
    ) external onlyOwner {
        require(incidents[incidentHash].attestedBy == address(0), "already attested");
        incidents[incidentHash] = Incident(country, confidence, severity, measurements, timestamp, msg.sender);
        totalAttestations++;
        emit IncidentAttested(incidentHash, country, severity, confidence, timestamp);
    }

    function isSafe(bytes2 country) external view returns (uint8 score, bool safe, uint64 lastUpdate) {
        CountryRisk memory r = countryRisks[country];
        return (r.score, r.score < 50, r.updatedAt);
    }

    function getScoredCountryCount() external view returns (uint256) { return scoredCountries.length; }
    function transferOwnership(address newOwner) external onlyOwner { owner = newOwner; }
}
