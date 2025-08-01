"""
Integration test for advanced reasoning API endpoints
"""

import asyncio
import httpx
import json
from typing import Dict, Any


class ReasoningAPITester:
    """Test client for reasoning API endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def test_health_check(self) -> bool:
        """Test health endpoint"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print("✓ Health check passed")
                print(f"  Models loaded: {data.get('models_loaded', {})}")
                return True
            else:
                print(f"✗ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            return False
    
    async def test_generate_advanced_reasoning(self) -> bool:
        """Test advanced reasoning generation endpoint"""
        try:
            payload = {
                "claim": "Remote work increases productivity",
                "evidence": [
                    "Studies show 40% increase in productivity for remote workers",
                    "Reduced commute time allows more focus on work",
                    "Flexible schedules improve work-life balance"
                ],
                "reasoning_type": "inductive",
                "complexity": "intermediate",
                "max_steps": 5,
                "use_llm": False,  # Use fallback for testing
                "include_analysis": True
            }
            
            response = await self.client.post(
                f"{self.base_url}/reasoning/generate",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Advanced reasoning generation test passed")
                print(f"  Generated {len(data.get('reasoning_chains', []))} chains")
                print(f"  Processing time: {data.get('processing_time', 0):.3f}s")
                
                if data.get('reasoning_chains'):
                    chain = data['reasoning_chains'][0]
                    print(f"  Chain confidence: {chain.get('overall_confidence', 0):.2f}")
                    print(f"  Logical validity: {chain.get('logical_validity', 0):.2f}")
                
                return True
            else:
                print(f"✗ Advanced reasoning generation failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Advanced reasoning generation failed: {e}")
            return False
    
    async def test_validate_reasoning(self) -> bool:
        """Test reasoning validation endpoint"""
        try:
            payload = {
                "claim": "Exercise improves mental health",
                "reasoning_steps": [
                    "Physical activity releases endorphins",
                    "Endorphins are natural mood elevators",
                    "Elevated mood indicates improved mental health",
                    "Therefore, exercise improves mental health"
                ],
                "evidence": [
                    "Scientific studies on endorphin release during exercise",
                    "Research on mood improvements after physical activity"
                ],
                "reasoning_type": "deductive"
            }
            
            response = await self.client.post(
                f"{self.base_url}/reasoning/validate",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Reasoning validation test passed")
                print(f"  Validation score: {data.get('validation_score', 0):.2f}")
                print(f"  Is valid: {data.get('is_valid', False)}")
                print(f"  Issues found: {len(data.get('issues', {}).get('logical_gaps', []))} gaps, {len(data.get('issues', {}).get('fallacies', []))} fallacies")
                
                return True
            else:
                print(f"✗ Reasoning validation failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Reasoning validation failed: {e}")
            return False
    
    async def test_identify_gaps(self) -> bool:
        """Test gap identification endpoint"""
        try:
            params = {
                "claim": "Social media causes depression",
                "reasoning_steps": [
                    "Many people use social media",
                    "Some people are depressed",
                    "Therefore, social media causes depression"
                ],
                "evidence": [],
                "reasoning_type": "deductive"
            }
            
            response = await self.client.post(
                f"{self.base_url}/reasoning/gaps",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Gap identification test passed")
                print(f"  Logical gaps found: {len(data.get('logical_gaps', []))}")
                print(f"  Gap severity: {data.get('gap_severity', 0):.2f}")
                print(f"  Evidence requirements: {len(data.get('evidence_requirements', []))}")
                
                return True
            else:
                print(f"✗ Gap identification failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Gap identification failed: {e}")
            return False
    
    async def test_strengthen_reasoning(self) -> bool:
        """Test reasoning strengthening endpoint"""
        try:
            params = {
                "claim": "Reading books improves vocabulary",
                "reasoning_steps": [
                    "Books contain many words",
                    "Reading exposes you to words",
                    "Therefore, reading improves vocabulary"
                ],
                "evidence": [
                    "Studies show vocabulary growth in regular readers"
                ],
                "reasoning_type": "inductive",
                "complexity": "intermediate"
            }
            
            response = await self.client.post(
                f"{self.base_url}/reasoning/strengthen",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Reasoning strengthening test passed")
                print(f"  Improvements made: {len(data.get('improvements', []))}")
                print(f"  Strength increase: {data.get('strength_increase', 0):.2f}")
                
                strengthened = data.get('strengthened_reasoning', {})
                if strengthened:
                    print(f"  New step count: {len(strengthened.get('steps', []))}")
                    print(f"  New confidence: {strengthened.get('overall_confidence', 0):.2f}")
                
                return True
            else:
                print(f"✗ Reasoning strengthening failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Reasoning strengthening failed: {e}")
            return False
    
    async def test_multi_claim_reasoning(self) -> bool:
        """Test multi-claim reasoning analysis endpoint"""
        try:
            payload = {
                "claims": [
                    "Electric vehicles reduce carbon emissions",
                    "Battery technology is improving rapidly",
                    "Government incentives support EV adoption"
                ],
                "relationships": [
                    {"type": "supports", "source": 1, "target": 0, "strength": 0.8},
                    {"type": "supports", "source": 2, "target": 0, "strength": 0.6}
                ],
                "reasoning_type": "inductive",
                "max_depth": 3,
                "include_cross_validation": True
            }
            
            response = await self.client.post(
                f"{self.base_url}/reasoning/multi-claim",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Multi-claim reasoning test passed")
                print(f"  Primary chains: {len(data.get('primary_reasoning_chains', []))}")
                print(f"  Network validity: {data.get('network_validity', 0):.2f}")
                print(f"  Inconsistencies: {len(data.get('inconsistencies', []))}")
                print(f"  Suggestions: {len(data.get('strengthening_suggestions', []))}")
                
                return True
            else:
                print(f"✗ Multi-claim reasoning failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Multi-claim reasoning failed: {e}")
            return False
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests"""
        print("Running Reasoning API Integration Tests")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Advanced Reasoning Generation", self.test_generate_advanced_reasoning),
            ("Reasoning Validation", self.test_validate_reasoning),
            ("Gap Identification", self.test_identify_gaps),
            ("Reasoning Strengthening", self.test_strengthen_reasoning),
            ("Multi-Claim Reasoning", self.test_multi_claim_reasoning)
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\nRunning {test_name}...")
            try:
                result = await test_func()
                results[test_name] = result
            except Exception as e:
                print(f"✗ {test_name} failed with exception: {e}")
                results[test_name] = False
        
        print("\n" + "=" * 50)
        print("API Test Results Summary:")
        passed = sum(results.values())
        total = len(results)
        print(f"Passed: {passed}/{total}")
        print(f"Failed: {total - passed}/{total}")
        
        if all(results.values()):
            print("🎉 All API tests passed!")
        else:
            print("⚠️  Some API tests failed. Check the output above for details.")
            print("\nNote: If the service is not running, start it with:")
            print("  python main.py")
        
        return results
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


async def main():
    """Main test runner"""
    tester = ReasoningAPITester()
    
    try:
        results = await tester.run_all_tests()
        return results
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())