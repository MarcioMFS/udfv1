using Microsoft.EntityFrameworkCore;
using System;

namespace PVServer.Models
{
    public class GameContext : DbContext
    {
        public GameContext(DbContextOptions<GameContext> options) : base(options) { }

        public DbSet<PVInstructor> instructors { get; set; }
        public DbSet<PVEvent> events { get; set; }
        public DbSet<PVMatch> matches { get; set; }
        public DbSet<PVPlayerIdentifier> players { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PVInstructor>().HasKey(x => x.appId);
            modelBuilder.Entity<PVInstructor>().Property(x => x.externalId).HasMaxLength(72);
            modelBuilder.Entity<PVInstructor>().Property(x => x.instructorName).IsRequired().HasMaxLength(72);
            modelBuilder.Entity<PVInstructor>().HasMany(x => x.events).WithOne(x => x.instructor);

            modelBuilder.Entity<PVEvent>().HasKey(x => x.eventId);
            modelBuilder.Entity<PVEvent>().Property(x => x.beginTime).IsRequired();
            modelBuilder.Entity<PVEvent>().Property(x => x.endTime).IsRequired();
            modelBuilder.Entity<PVEvent>().Property(x => x.eventName).IsRequired().HasMaxLength(72);
            modelBuilder.Entity<PVEvent>().HasMany(x => x.matches).WithOne(x => x.pvEvent);
            modelBuilder.Entity<PVEvent>().Property(x => x.eventCode).IsRequired().HasMaxLength(8);

            modelBuilder.Entity<PVPlayerIdentifier>().HasKey(x => x.playerId);
            modelBuilder.Entity<PVPlayerIdentifier>().Property(x => x.playerName).HasMaxLength(72);
            modelBuilder.Entity<PVPlayerIdentifier>().Property(x => x.playerEmail).HasMaxLength(72);
            modelBuilder.Entity<PVPlayerIdentifier>().Property(x => x.teamId).HasDefaultValue(1).IsRequired();
            modelBuilder.Entity<PVPlayerIdentifier>().Property(x => x.deviceIdentifier).HasMaxLength(72);

            modelBuilder.Entity<PVMatch>().HasKey(x => x.matchId);
            modelBuilder.Entity<PVMatch>().HasOne(x => x.player);
            modelBuilder.Entity<PVMatch>().Property(x => x.matchDate).IsRequired();
            modelBuilder.Entity<PVMatch>().Property(x => x.appSerial).HasColumnType("TEXT");
            modelBuilder.Entity<PVMatch>().Property(x => x.matchNumber).IsRequired();

            base.OnModelCreating(modelBuilder);
        }

        public PVEvent? getEventByCodeForNow(string codeId)
        {
            if (codeId.Length != 8) return null;
            PVEvent? ev = events.Include(x => x.instructor).FirstOrDefault(x => x.eventCode == codeId.ToLowerInvariant() && x.beginTime < System.DateTime.Now && x.endTime > System.DateTime.Now);
            return ev;
        }
        public PVEvent? getEventByCode(string codeId)
        {
            if (codeId.Length != 8) return null;
            return events.FirstOrDefault(x => x.eventCode == codeId.ToLowerInvariant());
        }
        
        public PVEvent? getRankingEventByCode(string codeId)
        {
            if (codeId.Length != 8) return null;
            PVEvent? ev = events.Include(x => x.instructor).Include(x => x.matches).ThenInclude(x => x.player).FirstOrDefault(x => x.eventCode == codeId.ToLowerInvariant());
            return ev;
        }

        public void saveMatch(GameDataManifest manifest, PVEvent pvEvent, string playerName, string playerEmail, string playerDI, int matchNumber, byte colorId)
        {
            PVMatch match = PVMatch.generateFromLegacy(manifest);
            match.matchId = Guid.NewGuid();
            match.pvEvent = pvEvent;
            match.matchNumber = matchNumber;

            PVPlayerIdentifier player = new PVPlayerIdentifier();
            player.playerId = Guid.NewGuid();
            player.playerEmail = playerEmail;
            player.playerName = playerName;
            player.deviceIdentifier = playerDI;
            player.teamId = colorId;
            players.Add(player);

            match.player = player;

            matches.Add(match);

            SaveChanges();
        }
    
        public PVInstructor saveInstructor(string instructorName)
        {
            PVInstructor instructor = new PVInstructor();
            instructor.appId = Guid.NewGuid();
            instructor.externalId = new Guid();
            instructor.instructorName = instructorName;
            instructors.Add(instructor);
            SaveChanges();
            return instructor;
        }
        public PVEvent saveEvent(string eventName, DateTime beginTime, DateTime endTime, Guid instructorId)
        {
            PVEvent ev = new PVEvent();
            ev.eventId = Guid.NewGuid();
            ev.beginTime = beginTime;
            ev.endTime = endTime;
            ev.eventName = eventName;
            ev.instructor = instructors.First(x => x.appId == instructorId);
            ev.eventCode = Guid.NewGuid().ToString().Substring(0, 8).ToLowerInvariant();
            events.Add(ev);
            SaveChanges();
            return ev;
        }
    }

    public class PVInstructor
    {
        public Guid appId;
        public Guid externalId;

        public string instructorName;

        public List<PVEvent> events;
    }
    public class PVEvent
    {
        public Guid eventId;
        public DateTime beginTime;
        public DateTime endTime;
        public string eventName;
        public PVInstructor instructor;
        public string eventCode;

        public List<PVMatch> matches;
    }
    public enum ARCode : byte
    {
        HOME,
        A,
        B,
        C,
        D,
        E,
        F,
        G,
        H
    }
    
    public class PVMatch
    {
        public Guid matchId;
        public PVEvent pvEvent;
        public DateTime matchDate;
        public PVPlayerIdentifier player;
        public string appSerial;
        public int matchNumber;

        public static PVMatch generateFromLegacy(GameDataManifest m)
        {
            PVMatch ret = new PVMatch();

            ret.matchDate = m.gameDate;
            ret.appSerial = m.netSerialize();

            return ret;
        }
    }
    public class PVPlayerIdentifier
    {
        public Guid playerId;

        public string playerName;
        public string playerEmail;
        public byte teamId;
        public string deviceIdentifier;
    }

    public enum PackageType
    {
        A = 2250,
        B = 1500,
        C = 1000
    }

    public struct DeliveryManifest
    {
        public ARCode source;
        public ARCode destination;
        public bool satisfaction;
        public PackageType type;

        public int value;
        public int bonusValue;

        public float deliveryTime;

        public DeliveryManifest(ARCode source, ARCode destination, bool satisfaction, PackageType type, int value, int bonusValue, float deliveryTime)
        {
            this.source = source;
            this.destination = destination;
            this.satisfaction = satisfaction;
            this.type = type;
            this.value = value;
            this.bonusValue = bonusValue;
            this.deliveryTime = deliveryTime;
        }

        public string serialize()
        {
            return string.Format("{0};{1};{2};{3};{4};{5};{6}",
                (byte)source,
                (byte)destination,
                satisfaction,
                (byte)type,
                value,
                bonusValue,
                deliveryTime);
        }
        public void deserialize(string serial)
        {
            string[] deserial = serial.Split(';');

            source = (ARCode)(byte.Parse(deserial[0]));
            destination = (ARCode)(byte.Parse(deserial[1]));
            satisfaction = bool.Parse(deserial[2]);
            type = (PackageType)(short.Parse(deserial[3]));
            value = int.Parse(deserial[4]);
            bonusValue = int.Parse(deserial[5]);
            deliveryTime = float.Parse(deserial[6]);
        }
    }
    public class GameDataManifest
    {
        public System.DateTime gameDate;
        public string gameName;

        public List<ARCode> travelLog = new List<ARCode>();
        public List<DeliveryManifest> deliveries = new List<DeliveryManifest>();
        public List<MockPackageData> generatedPackages = new List<MockPackageData>();

        public int getDeliveredPackagesByLocation(ARCode arCode)
        {
            return deliveries.Count(x => x.destination == arCode);
        }

        public int getLocationGeneratedPackages(ARCode arCode)
        {
            return 1;
            //return MockLocation.accumulatorGeneratedPackageCount[arCode];
        }

        public int getRevenueByLocation(ARCode arCode)
        {
            return deliveries.Where(x => x.source == arCode).Sum(y => y.value);
        }

        public int getCostByLocation(ARCode arCode)
        {
            int ret = 0;

            ARCode walker = ARCode.HOME;
            for (int i = 0; i < travelLog.Count; i++)
            {
                if (travelLog[i] == arCode)
                {
                    ret += MockLocation.pathCostGrid[walker][travelLog[i]];
                }
                walker = travelLog[i];
            }

            return ret;
        }

        public int getSatisfactionRatioByLocation(ARCode arCode)
        {
            DeliveryManifest[] dels = deliveries.Where(x => x.destination == arCode).ToArray();
            if (dels.Length > 0)
            {
                return (int)Math.Round(100f * dels.Count(x => x.satisfaction == true) / dels.Length);
            }

            return 0;
        }

        public int getBonusMoneyByLocation(ARCode arCode)
        {

            return deliveries.Where(x => x.destination == arCode).Sum(y => y.bonusValue);
        }

        public int numDeliveries
        {
            get
            {
                return deliveries.Count;
            }
        }
        public int numTravels
        {
            get
            {
                return travelLog.Count;
            }
        }

        public int cost
        {
            get
            {
                int ret = 0;
                for (int i = 0; i < travelLog.Count; i++)
                {
                    if (i == 0)
                    {
                        ret += MockLocation.pathCostGrid[ARCode.HOME][travelLog[i]];
                    }
                    else
                    {
                        ret += MockLocation.pathCostGrid[travelLog[i - 1]][travelLog[i]];
                    }
                }
                return ret;
            }
        }

        public int revenue
        {
            get
            {
                return deliveries.Sum(x => x.value);
            }
        }

        public int satisfaction
        {
            get
            {
                if (deliveries.Count > 0)
                    return (int)Math.Ceiling(100f * deliveries.Count(x => x.satisfaction) / deliveries.Count);
                return 0;
            }
        }
        public int bonusTarget;

        public float gameTime;

        public int profit
        {
            get
            {
                return revenue - cost;
            }
        }

        public int result
        {
            get
            {
                if (revenue == 0)
                    return 0;
                return (int)Math.Round(100f * profit / revenue);
            }
        }

        public int deliveredPackages
        {
            get
            {
                return deliveries.Count;
            }
        }

        public string favouriteLocation
        {
            get
            {
                //DeliveryManifest[] ADeliveries = deliveries.Where(x => x.destination == ARCode.A).ToArray();
                //DeliveryManifest[] BDeliveries = deliveries.Where(x => x.destination == ARCode.B).ToArray();
                //DeliveryManifest[] CDeliveries = deliveries.Where(x => x.destination == ARCode.C).ToArray();
                //DeliveryManifest[] DDeliveries = deliveries.Where(x => x.destination == ARCode.D).ToArray();
                //DeliveryManifest[] EDeliveries = deliveries.Where(x => x.destination == ARCode.E).ToArray();
                //DeliveryManifest[] FDeliveries = deliveries.Where(x => x.destination == ARCode.F).ToArray();
                //DeliveryManifest[] GDeliveries = deliveries.Where(x => x.destination == ARCode.G).ToArray();
                //DeliveryManifest[] HDeliveries = deliveries.Where(x => x.destination == ARCode.H).ToArray();

                //int max = Mathf.Max(ADeliveries.Length, BDeliveries.Length, CDeliveries.Length, DDeliveries.Length, EDeliveries.Length, FDeliveries.Length, GDeliveries.Length, HDeliveries.Length);
                //if (max > 0)
                //{
                //	if (max == ADeliveries.Length)
                //	{
                //		return "A";
                //	}
                //	else if (max == BDeliveries.Length)
                //	{
                //		return "B";
                //	}
                //	else if (max == CDeliveries.Length)
                //	{
                //		return "C";
                //	}
                //	else if (max == DDeliveries.Length)
                //	{
                //		return "D";
                //	}
                //	else if (max == EDeliveries.Length)
                //	{
                //		return "E";
                //	}
                //	else if (max == FDeliveries.Length)
                //	{
                //		return "F";
                //	}
                //	else if (max == GDeliveries.Length)
                //	{
                //		return "G";
                //	}
                //	else if (max == HDeliveries.Length)
                //	{
                //		return "H";
                //	}
                //}

                return "N/A";
            }
        }

        public float averageDeliveryTime
        {
            get
            {
                if (deliveries.Count > 0)
                {
                    return deliveries.Average(x => x.deliveryTime);
                }
                return 0f;
            }
        }

        public int getRevenueByPackage(PackageType packageType)
        {
            return deliveries.Where(x => x.type == packageType).Sum(y => y.value);
        }

        public int getDeliveryCountByPackage(PackageType packageType)
        {
            return deliveries.Count(x => x.type == packageType);
        }

        public int getSatisfactionRatioByPackage(PackageType packageType)
        {
            DeliveryManifest[] dels = deliveries.Where(x => x.type == packageType).ToArray();
            if (dels.Length > 0)
            {
                return (int)Math.Round(100f * dels.Count(x => x.satisfaction) / dels.Length);
            }
            return 0;
        }

        public int bonus
        {
            get
            {
                int ret = 0;

                ARCode[] arCodes = new ARCode[]
                {
                ARCode.A,
                ARCode.B,
                ARCode.C,
                ARCode.D,
                ARCode.E,
                ARCode.F,
                ARCode.G,
                ARCode.H
                };
                for (int i = 0; i < arCodes.Length; i++)
                {
                    int dc = deliveries.Count(x => x.source == arCodes[i] && x.satisfaction);
                    if (dc > bonusTarget)
                    {
                        ret += dc - bonusTarget;
                    }
                    else if (dc == bonusTarget)
                    {
                        ret++;
                    }
                }

                return ret;
            }
        }

        public int bonusMoney
        {
            get
            {
                return deliveries.Sum(x => x.bonusValue);
            }
        }

        public string serialize()
        {
            return string.Format("{0}#{1}#{2}#{3}#{4}#{5}#{6}",
                gameDate.Ticks.ToString(),
                string.Join(",", travelLog.Select(x => ((int)x).ToString())),
                string.Join("|", deliveries.Select(x => x.serialize())),
                bonusTarget,
                gameTime,
                gameName,
                numLocs
                );
        }

        public void deserialize(string serial)
        {
            string[] deserial = serial.Split('#');
            gameDate = new System.DateTime(long.Parse(deserial[0]));

            travelLog.Clear();
            string[] split = deserial[1].Split(',');
            for (int i = 0; i < split.Length; i++)
            {
                int d = int.Parse(split[i]);
                travelLog.Add((ARCode)d);
            }
            deliveries.Clear();
            split = deserial[2].Split('|');
            for (int i = 0; i < split.Length; i++)
            {
                DeliveryManifest m = new DeliveryManifest();
                m.deserialize(split[i]);
                deliveries.Add(m);
            }
            bonusTarget = int.Parse(deserial[3]);
            gameTime = float.Parse(deserial[4]);
            gameName = deserial[5];
            numLocs = int.Parse(deserial[6]);
            if(deserial.Length > 7)
            {
                split = deserial[7].Split(',');
                for (int i = 0; i < split.Length; i++)
                {
                    MockPackageData d = new MockPackageData(split[i]);
                    generatedPackages.Add(d);
                }
            }
        }

        public string netSerialize()
        {
            return serialize();
        }

        public int numLocs = 0;
    }
    public class MockLocation
    {
        public static Dictionary<ARCode, MockLocation> byCode = new Dictionary<ARCode, MockLocation>();
        public static Dictionary<ARCode, Dictionary<ARCode, int>> pathCostGrid;
        public static Dictionary<ARCode, int> accumulatorGeneratedPackageCount = new Dictionary<ARCode, int>();

        static MockLocation()
        {
            pathCostGrid = new Dictionary<ARCode, Dictionary<ARCode, int>>()
        {
            {ARCode.HOME, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 0 },
                    { ARCode.A, 1000 }, //1200
                    { ARCode.B, 1250 }, //1000
                    { ARCode.C, 900  }, //1250
                    { ARCode.D, 1100 }, //900
                    { ARCode.E, 950  }, //1100
                    { ARCode.F, 1150 }, //950
                    { ARCode.G, 1050 }, //1150
                    { ARCode.H, 1200 } //1050
                }
            },
            {ARCode.A, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1000 }, //950
                    { ARCode.A, 0 },
                    { ARCode.B, 800 }, //1000
                    { ARCode.C, 1100 }, //800
                    { ARCode.D, 1500 }, //1100
                    { ARCode.E, 1750 }, //1500
                    { ARCode.F, 1650 }, //1750
                    { ARCode.G, 1350 }, //1650
                    { ARCode.H, 950 } //1350
                }
            },
            {ARCode.B, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1250 }, //1650
                    { ARCode.A, 800 }, //1250
                    { ARCode.B, 0 },
                    { ARCode.C, 950 }, //800
                    { ARCode.D, 1350 }, //950
                    { ARCode.E, 1100 }, //1350
                    { ARCode.F, 1750 }, //1100
                    { ARCode.G, 1500 }, //1750
                    { ARCode.H, 1650 } //1500
                }
            },
            {ARCode.C, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 900 }, //1750
                    { ARCode.A, 1100 }, //900
                    { ARCode.B, 950 }, //1100
                    { ARCode.C, 0 },
                    { ARCode.D, 800 }, //950
                    { ARCode.E, 1350 }, //800
                    { ARCode.F, 1500 }, //1350
                    { ARCode.G, 1650 }, //1500
                    { ARCode.H, 1750 } //1650
                }
            },
            {ARCode.D, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1100 }, //1650
                    { ARCode.A, 1500 }, //1100
                    { ARCode.B, 1350 }, //1500
                    { ARCode.C, 800 }, //1350
                    { ARCode.D, 0 },
                    { ARCode.E, 950 }, //800
                    { ARCode.F, 1100 }, //950
                    { ARCode.G, 1750 }, //1100
                    { ARCode.H, 1650 } //1750
                }
            },
            {ARCode.E, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 950 }, //1500
                    { ARCode.A, 1750 }, //950
                    { ARCode.B, 1100 }, //1750
                    { ARCode.C, 1350 }, //1100
                    { ARCode.D, 950 }, //1350
                    { ARCode.E, 0 },
                    { ARCode.F, 950 }, //950
                    { ARCode.G, 800 }, //950
                    { ARCode.H, 1500 } //800
                }
            },
            {ARCode.F, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1150 }, //1100
                    { ARCode.A, 1650 }, //1150
                    { ARCode.B, 1750 }, //1650
                    { ARCode.C, 1500 }, //1750
                    { ARCode.D, 1100 }, //1500
                    { ARCode.E, 950 }, //1100
                    { ARCode.F, 0 },
                    { ARCode.G, 800 }, //950
                    { ARCode.H, 1100 } //800
                }
            },
            {ARCode.G, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1050 }, //950
                    { ARCode.A, 1350 }, //1050
                    { ARCode.B, 1500 }, //1350
                    { ARCode.C, 1650 }, //1500
                    { ARCode.D, 1750 }, //1650
                    { ARCode.E, 800 }, //1750
                    { ARCode.F, 800 }, //800
                    { ARCode.G, 0 },
                    { ARCode.H, 950 } //800
                }
            },
            {ARCode.H, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1200 }, //950
                    { ARCode.A, 950 }, //1200
                    { ARCode.B, 1650 }, //950
                    { ARCode.C, 1750 }, //1650
                    { ARCode.D, 1650 }, //1750
                    { ARCode.E, 1500 }, //1650
                    { ARCode.F, 1100 }, //1500
                    { ARCode.G, 950 }, //1100
                    { ARCode.H, 0 }
                }
            }
        };
        }

        public static void LoadTrainingPathCostGrid()
        {
            pathCostGrid = new Dictionary<ARCode, Dictionary<ARCode, int>>()
        {
            {ARCode.HOME, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 0 },
                    { ARCode.A, 1200 }, //1200
                    { ARCode.B, 1000 }, //1000
                    { ARCode.C, 1250  }, //1250
                    { ARCode.D, 900 }, //900
                    { ARCode.E, 1100  }, //1100
                    { ARCode.F, 950 }, //950
                    { ARCode.G, 1150 }, //1150
                    { ARCode.H, 1050 } //1050
                }
            },
            {ARCode.A, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 950 }, //950
                    { ARCode.A, 0 },
                    { ARCode.B, 1000 }, //1000
                    { ARCode.C, 800 }, //800
                    { ARCode.D, 1100 }, //1100
                    { ARCode.E, 1500 }, //1500
                    { ARCode.F, 1750 }, //1750
                    { ARCode.G, 1650 }, //1650
                    { ARCode.H, 1350 } //1350
                }
            },
            {ARCode.B, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1650 }, //1650
                    { ARCode.A, 1250 }, //1250
                    { ARCode.B, 0 },
                    { ARCode.C, 800 }, //800
                    { ARCode.D, 950 }, //950
                    { ARCode.E, 1350 }, //1350
                    { ARCode.F, 1100 }, //1100
                    { ARCode.G, 1750 }, //1750
                    { ARCode.H, 1500 } //1500
                }
            },
            {ARCode.C, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1750 }, //1750
                    { ARCode.A, 900 }, //900
                    { ARCode.B, 1100 }, //1100
                    { ARCode.C, 0 },
                    { ARCode.D, 950 }, //950
                    { ARCode.E, 800 }, //800
                    { ARCode.F, 1350 }, //1350
                    { ARCode.G, 1500 }, //1500
                    { ARCode.H, 1650 } //1650
                }
            },
            {ARCode.D, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1650 }, //1650
                    { ARCode.A, 1100 }, //1100
                    { ARCode.B, 1500 }, //1500
                    { ARCode.C, 1350 }, //1350
                    { ARCode.D, 0 },
                    { ARCode.E, 800 }, //800
                    { ARCode.F, 950 }, //950
                    { ARCode.G, 1100 }, //1100
                    { ARCode.H, 1750 } //1750
                }
            },
            {ARCode.E, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1500 }, //1500
                    { ARCode.A, 950 }, //950
                    { ARCode.B, 1750 }, //1750
                    { ARCode.C, 1100 }, //1100
                    { ARCode.D, 1350 }, //1350
                    { ARCode.E, 0 },
                    { ARCode.F, 950 }, //950
                    { ARCode.G, 950 }, //950
                    { ARCode.H, 800 } //800
                }
            },
            {ARCode.F, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1100 }, //1100
                    { ARCode.A, 1150 }, //1150
                    { ARCode.B, 1650 }, //1650
                    { ARCode.C, 1750 }, //1750
                    { ARCode.D, 1500 }, //1500
                    { ARCode.E, 1100 }, //1100
                    { ARCode.F, 0 },
                    { ARCode.G, 950 }, //950
                    { ARCode.H, 800 } //800
                }
            },
            {ARCode.G, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 950 }, //950
                    { ARCode.A, 1050 }, //1050
                    { ARCode.B, 1350 }, //1350
                    { ARCode.C, 1500 }, //1500
                    { ARCode.D, 1650 }, //1650
                    { ARCode.E, 1750 }, //1750
                    { ARCode.F, 800 }, //800
                    { ARCode.G, 0 },
                    { ARCode.H, 800 } //800
                }
            },
            {ARCode.H, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 950 }, //950
                    { ARCode.A, 1200 }, //1200
                    { ARCode.B, 950 }, //950
                    { ARCode.C, 1650 }, //1650
                    { ARCode.D, 1750 }, //1750
                    { ARCode.E, 1650 }, //1650
                    { ARCode.F, 1500 }, //1500
                    { ARCode.G, 1100 }, //1100
                    { ARCode.H, 0 }
                }
            }
        };
        }
        public static void LoadDefaultPathCostGrid()
        {
            pathCostGrid = new Dictionary<ARCode, Dictionary<ARCode, int>>()
        {
            {ARCode.HOME, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 0 },
                    { ARCode.A, 1000 }, //1200
                    { ARCode.B, 1250 }, //1000
                    { ARCode.C, 900  }, //1250
                    { ARCode.D, 1100 }, //900
                    { ARCode.E, 950  }, //1100
                    { ARCode.F, 1150 }, //950
                    { ARCode.G, 1050 }, //1150
                    { ARCode.H, 1200 } //1050
                }
            },
            {ARCode.A, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1000 }, //950
                    { ARCode.A, 0 },
                    { ARCode.B, 800 }, //1000
                    { ARCode.C, 1100 }, //800
                    { ARCode.D, 1500 }, //1100
                    { ARCode.E, 1750 }, //1500
                    { ARCode.F, 1650 }, //1750
                    { ARCode.G, 1350 }, //1650
                    { ARCode.H, 950 } //1350
                }
            },
            {ARCode.B, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1250 }, //1650
                    { ARCode.A, 800 }, //1250
                    { ARCode.B, 0 },
                    { ARCode.C, 950 }, //800
                    { ARCode.D, 1350 }, //950
                    { ARCode.E, 1100 }, //1350
                    { ARCode.F, 1750 }, //1100
                    { ARCode.G, 1500 }, //1750
                    { ARCode.H, 1650 } //1500
                }
            },
            {ARCode.C, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 900 }, //1750
                    { ARCode.A, 1100 }, //900
                    { ARCode.B, 950 }, //1100
                    { ARCode.C, 0 },
                    { ARCode.D, 800 }, //950
                    { ARCode.E, 1350 }, //800
                    { ARCode.F, 1500 }, //1350
                    { ARCode.G, 1650 }, //1500
                    { ARCode.H, 1750 } //1650
                }
            },
            {ARCode.D, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1100 }, //1650
                    { ARCode.A, 1500 }, //1100
                    { ARCode.B, 1350 }, //1500
                    { ARCode.C, 800 }, //1350
                    { ARCode.D, 0 },
                    { ARCode.E, 950 }, //800
                    { ARCode.F, 1100 }, //950
                    { ARCode.G, 1750 }, //1100
                    { ARCode.H, 1650 } //1750
                }
            },
            {ARCode.E, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 950 }, //1500
                    { ARCode.A, 1750 }, //950
                    { ARCode.B, 1100 }, //1750
                    { ARCode.C, 1350 }, //1100
                    { ARCode.D, 950 }, //1350
                    { ARCode.E, 0 },
                    { ARCode.F, 950 }, //950
                    { ARCode.G, 800 }, //950
                    { ARCode.H, 1500 } //800
                }
            },
            {ARCode.F, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1150 }, //1100
                    { ARCode.A, 1650 }, //1150
                    { ARCode.B, 1750 }, //1650
                    { ARCode.C, 1500 }, //1750
                    { ARCode.D, 1100 }, //1500
                    { ARCode.E, 950 }, //1100
                    { ARCode.F, 0 },
                    { ARCode.G, 800 }, //950
                    { ARCode.H, 1100 } //800
                }
            },
            {ARCode.G, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1050 }, //950
                    { ARCode.A, 1350 }, //1050
                    { ARCode.B, 1500 }, //1350
                    { ARCode.C, 1650 }, //1500
                    { ARCode.D, 1750 }, //1650
                    { ARCode.E, 800 }, //1750
                    { ARCode.F, 800 }, //800
                    { ARCode.G, 0 },
                    { ARCode.H, 950 } //800
                }
            },
            {ARCode.H, new Dictionary<ARCode, int>()
                {
                    { ARCode.HOME, 1200 }, //950
                    { ARCode.A, 950 }, //1200
                    { ARCode.B, 1650 }, //950
                    { ARCode.C, 1750 }, //1650
                    { ARCode.D, 1650 }, //1750
                    { ARCode.E, 1500 }, //1650
                    { ARCode.F, 1100 }, //1500
                    { ARCode.G, 950 }, //1100
                    { ARCode.H, 0 }
                }
            }
        };
        }
    }

    public class MockPackageData
    {
        public PackageType type;
        public ARCode source;
        public ARCode destination;
        public float timeCreated;

        public MockPackageData(string serial)
        {
            string[] split = serial.Split('_');
            type = (PackageType)short.Parse(split[0]);
            source = (ARCode)byte.Parse(split[1]);
            destination = (ARCode)byte.Parse(split[2]);
            timeCreated = float.Parse(split[3]);
        }
        public string serialize()
        {
            return string.Format("{0}_{1}_{2}_{3}",
                (short)type,
                (byte)source,
                destination,
                timeCreated);
        }

    }

    [Serializable]
    public class PVPerformanceData
    {
        //public Guid Id;
        public string name;
        public string email;
        public int profit;
        public int satisfaction;
        public int bonus;
        public int colorId;
        public int matchNumber;

        public PVPerformanceData(PVMatch match)
        {
            name = match.player.playerName;
            email = match.player.playerEmail;

            GameDataManifest manifest = new GameDataManifest();
            manifest.deserialize(match.appSerial);

            profit = manifest.profit;
            satisfaction = manifest.satisfaction;
            bonus = manifest.bonus;
            colorId = match.player.teamId;
            matchNumber = (byte)match.matchNumber;
        }
        public PVPerformanceData(Match match)
        {
            name = match.Player.Name;
            email = match.Player.Email;

            GameDataManifest manifest = new GameDataManifest();
            manifest.deserialize(match.AppSerial);

            profit = manifest.profit;
            satisfaction = manifest.satisfaction;
            bonus = manifest.bonus;
            colorId = (int)match.Player.Color.Value;
            matchNumber = match.MatchNumber.Value;
        }
    }
}
