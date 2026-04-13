// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CensorshipOracle
 * @notice On-chain censorship intelligence oracle powered by Voidly.
 *         Stores country risk scores and verified censorship incident attestations.
 *         Any DeFi protocol can query this oracle to assess censorship risk
 *         before executing transactions in high-risk regions.
 * @dev Deployed on opBNB for minimal gas costs.
 * @author Voidly (voidly.ai) — Network intelligence built on trust.
 */
contract CensorshipOracle {
    address public owner;

    struct CountryRisk {
        uint8 score;          // 0-100 (higher = more censored)
        uint64 updatedAt;     // Last update timestamp
        uint16 incidentCount; // Number of active incidents
        string riskLevel;     // "critical", "high", "medium", "low"
    }

    struct Incident {
        string incidentId;    // e.g., "IR-2026-0150"
        string country;       // ISO 3166-1 alpha-2
        string title;
        string severity;      // "critical", "warning", "info"
        string incidentType;  // "censorship", "disruption"
        uint8 confidence;     // 0-100
        uint32 measurements;  // Number of confirming measurements
        uint64 timestamp;     // When the incident started
        string sources;       // "ooni,ioda,censoredplanet"
        address attestedBy;   // TEE wallet that created the attestation
    }

    // Country code => risk data
    mapping(string => CountryRisk) public countryRisks;

    // Incident ID => attestation
    mapping(string => Incident) public incidents;

    // Total attestation count
    uint256 public totalAttestations;

    // All country codes that have been scored
    string[] public scoredCountries;
    mapping(string => bool) private countryExists;

    // Events
    event CountryRiskUpdated(
        string indexed country,
        uint8 score,
        string riskLevel,
        uint16 incidentCount,
        uint64 timestamp
    );

    event IncidentAttested(
        string indexed incidentId,
        string country,
        string severity,
        uint8 confidence,
        uint32 measurements,
        uint64 timestamp,
        address attestedBy
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "CensorshipOracle: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Update the censorship risk score for a country.
     * @param country ISO 3166-1 alpha-2 code (e.g., "IR", "CN", "RU")
     * @param score Risk score 0-100 (higher = more censored)
     * @param riskLevel Human-readable level ("critical", "high", "medium", "low")
     * @param incidentCount Number of active censorship incidents
     */
    function updateCountryRisk(
        string calldata country,
        uint8 score,
        string calldata riskLevel,
        uint16 incidentCount
    ) external onlyOwner {
        if (!countryExists[country]) {
            scoredCountries.push(country);
            countryExists[country] = true;
        }

        countryRisks[country] = CountryRisk({
            score: score,
            updatedAt: uint64(block.timestamp),
            incidentCount: incidentCount,
            riskLevel: riskLevel
        });

        emit CountryRiskUpdated(country, score, riskLevel, incidentCount, uint64(block.timestamp));
    }

    /**
     * @notice Attest a verified censorship incident on-chain.
     * @dev Called by the AI agent via the TEE wallet. Creates an immutable
     *      record that can be verified by anyone.
     */
    function attestIncident(
        string calldata incidentId,
        string calldata country,
        string calldata title,
        string calldata severity,
        string calldata incidentType,
        uint8 confidence,
        uint32 measurements,
        uint64 timestamp,
        string calldata sources
    ) external onlyOwner {
        require(bytes(incidents[incidentId].incidentId).length == 0, "Incident already attested");

        incidents[incidentId] = Incident({
            incidentId: incidentId,
            country: country,
            title: title,
            severity: severity,
            incidentType: incidentType,
            confidence: confidence,
            measurements: measurements,
            timestamp: timestamp,
            sources: sources,
            attestedBy: msg.sender
        });

        totalAttestations++;

        emit IncidentAttested(
            incidentId,
            country,
            severity,
            confidence,
            measurements,
            timestamp,
            msg.sender
        );
    }

    /**
     * @notice Check if it's safe to transact from a country.
     * @return score Risk score (0-100)
     * @return safe True if score < 50
     * @return level Risk level string
     * @return lastUpdate When the data was last updated
     */
    function isSafe(string calldata country) external view returns (
        uint8 score,
        bool safe,
        string memory level,
        uint64 lastUpdate
    ) {
        CountryRisk memory risk = countryRisks[country];
        return (risk.score, risk.score < 50, risk.riskLevel, risk.updatedAt);
    }

    /**
     * @notice Get the number of scored countries.
     */
    function getScoredCountryCount() external view returns (uint256) {
        return scoredCountries.length;
    }

    /**
     * @notice Transfer oracle ownership (e.g., to a TEE wallet).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
