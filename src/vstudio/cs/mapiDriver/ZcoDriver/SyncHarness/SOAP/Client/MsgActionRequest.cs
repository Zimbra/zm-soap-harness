using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class MsgActionRequest : RequestBody
    {
        public enum ActionOperation
        {
            delete,
            read,
            unread,
            flag,
            unflag,
            tag,
            untag,
            move,
            trash,
            spam,
            update
        }

        XmlElement actionElement;

        public MsgActionRequest(): base()
        {
            XmlElement xmlElement = this.CreateElement("MsgActionRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);

            actionElement = this.CreateElement("action");
            this.FirstChild.AppendChild(actionElement);
        }

        public MsgActionRequest(string envelope): base(envelope)
        {}

        public MsgActionRequest SetAction(string ids, ActionOperation op)
        {
            SetId(ids);
            SetOp(op);

            return (this);
        }

        public MsgActionRequest SetAction(string ids, ActionOperation op, string target)
        {
            SetId(ids);
            SetOp(op);

            switch ( op )
            {
                case ActionOperation.tag:
                    SetTag(target);
                    break;

                case ActionOperation.untag:
                    UnsetTag(target);
                    break;

                case ActionOperation.move:
                    SetFolder(target);
                    break;

                case ActionOperation.delete:
                case ActionOperation.flag:
                case ActionOperation.unflag:
                case ActionOperation.read:
                case ActionOperation.unread:
                case ActionOperation.trash:
                    // No target required
                    break;
                case ActionOperation.update:
                    throw new Exception("Not supported - for op=update, use SetActionUpdate method");
            }
            return (this);
        }

        public MsgActionRequest SetActionUpdate(string ids, string folder, string name, string color, string tags, string flags)
        {
            SetOp(ActionOperation.update);
            SetId(ids);

            if (folder != null)
            {
                SetFolder(folder);
            }

            if (name != null)
            {
                SetName(name);
            }

            if (color != null)
            {
                throw new HarnessException("MsgActionRequest - color not implemented");
            }

            if (tags != null)
            {
                throw new HarnessException("MsgActionRequest - tags not implemented");
            }

            if (flags != null)
            {
                throw new HarnessException("MsgActionRequest - flags not implemented");
            }

            return (this);
        }

        public MsgActionRequest SetId(string ids)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("id"))
                    {
                        a.Value = ids;
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("id", ids);
            return (this);
        }

        public MsgActionRequest SetOp(ActionOperation op)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("op"))
                    {
                        a.Value = ActionOperationsToString(op);
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("op", ActionOperationsToString(op));
            return (this);
        }

        public MsgActionRequest SetTag(string tag)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("tag"))
                    {
                        a.Value = tag;
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("tag", tag);
            return (this);
        }

        public MsgActionRequest UnsetTag(string tag)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("tag"))
                    {
                        a.Value = tag;
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("tag", tag);
            return (this);
        }

        public MsgActionRequest SetFolder(string folder)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("l"))
                    {
                        a.Value = folder;
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("l", folder);
            return (this);
        }

        public MsgActionRequest SetName(string name)
        {
            if (actionElement.Attributes != null)
            {
                foreach (XmlAttribute a in actionElement.Attributes)
                {
                    if (a.Name.Equals("name"))
                    {
                        a.Value = name;
                        return (this);
                    }
                }
            }

            actionElement.SetAttribute("name", name);
            return (this);
        }

        private string ActionOperationsToString(ActionOperation op)
        {
            switch (op)
            {
                case ActionOperation.delete:    return ("delete");
                case ActionOperation.read:      return ("read");
                case ActionOperation.unread:    return ("!read");
                case ActionOperation.flag:      return ("flag");
                case ActionOperation.unflag:    return ("!flag");
                case ActionOperation.tag:       return ("tag");
                case ActionOperation.untag:     return ("!tag");
                case ActionOperation.move:      return ("move");
                case ActionOperation.trash:     return ("trash");
                case ActionOperation.update:    return ("update");
            }
            return ("flag");
        }
    }
}